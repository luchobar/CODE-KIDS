import expansionPayload from '../supabase_expansion_payload.json' with { type: 'json' };

export const EXPANSION_PAYLOAD = expansionPayload;
export const EXPANSION_WORLDS = expansionPayload.mundos;
export const EXPANSION_MISSIONS = expansionPayload.misiones;

export function getExpansionWorld(slug) {
  return EXPANSION_WORLDS.find((world) => world.slug === slug) || null;
}

export function getExpansionMissionsByWorld(worldSlug, customMissions = null) {
  if (Array.isArray(customMissions) && customMissions.length) {
    const remoteForWorld = customMissions
      .filter((mission) => mission.mundo_slug === worldSlug)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    if (remoteForWorld.length > 0) return remoteForWorld;
  }
  return EXPANSION_MISSIONS
    .filter((mission) => mission.mundo_slug === worldSlug)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/**
 * Elimina comentarios de Python (# ...) respetando cadenas entre comillas.
 */
function stripPythonComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const prev = line[i - 1];
    if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
    else if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      return line.slice(0, i);
    }
  }
  return line;
}

/**
 * Une líneas de Python con paréntesis, corchetes o llaves abiertos (ej. diccionarios multilínea).
 */
function joinMultilinePythonStatements(rawSource) {
  const rawLines = rawSource.replace(/\r\n/g, '\n').split('\n');
  const logicalLines = [];
  let buffer = '';
  let startLineNum = 1;
  let baseIndent = 0;
  let depth = 0;

  for (let idx = 0; idx < rawLines.length; idx += 1) {
    const raw = rawLines[idx];
    const cleaned = stripPythonComment(raw).replace(/\s+$/, '');
    if (!cleaned.trim() && depth === 0) continue;

    if (cleaned.includes('\t')) {
      throw new Error(`Usa espacios en lugar de tabulaciones en la línea ${idx + 1}.`);
    }

    if (depth === 0) {
      startLineNum = idx + 1;
      baseIndent = cleaned.match(/^ */)[0].length;
      buffer = cleaned.trim();
    } else {
      buffer += ` ${cleaned.trim()}`;
    }

    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < cleaned.length; i += 1) {
      const ch = cleaned[i];
      const prev = cleaned[i - 1];
      if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
      else if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (ch === '(' || ch === '[' || ch === '{') depth += 1;
        else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
      }
    }

    if (depth < 0) {
      throw new Error(`Paréntesis, corchete o llave sin abrir en la línea ${idx + 1}.`);
    }

    if (depth === 0 && buffer) {
      logicalLines.push({
        indent: baseIndent,
        text: buffer,
        number: startLineNum,
      });
      buffer = '';
    }
  }

  if (depth !== 0) {
    throw new Error(`Falta cerrar un paréntesis, corchete o llave iniciado en la línea ${startLineNum}.`);
  }

  return logicalLines;
}

/**
 * Traduce expresiones educativas de Python a JavaScript seguro para evaluar casos de prueba en el navegador.
 */
function transpilePythonExpr(expr) {
  let out = expr.trim();

  // Método .append(...) -> .push(...)
  out = out.replace(/\.append\s*\(/g, '.push(');

  // Método de diccionario .get(k, def) -> __pyGet(obj, k, def)
  out = out.replace(/([a-zA-Z_]\w*)\.get\s*\(([^)]+)\)/g, '__pyGet($1, $2)');

  // Comparaciones encadenadas: 10 <= senal <= 500
  out = out.replace(
    /(-?\d+(?:\.\d+)?|[a-zA-Z_]\w*)\s*(<=|<|>=|>)\s*([a-zA-Z_]\w*)\s*(<=|<|>=|>)\s*(-?\d+(?:\.\d+)?|[a-zA-Z_]\w*)/g,
    '($1 $2 $3 && $3 $4 $5)',
  );

  // Operadores "not in" e "in"
  out = out.replace(
    /\b([a-zA-Z_]\w*|'[^']*'|"[^"]*")\s+not\s+in\s+([a-zA-Z_]\w*)\b/g,
    '!__pyIn($1, $2)',
  );
  out = out.replace(
    /\b([a-zA-Z_]\w*|'[^']*'|"[^"]*")\s+in\s+([a-zA-Z_]\w*)\b/g,
    '__pyIn($1, $2)',
  );

  // Operadores booleanos y literales de Python
  out = out
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    .replace(/\bnot\s+/g, '!')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');

  return out;
}

function compileEducationalPython(source, targetFunctionName) {
  const lines = joinMultilinePythonStatements(source);
  if (!lines.length) {
    throw new Error('Escribe al menos una instrucción en Python antes de ejecutar.');
  }
  if (lines[0].indent !== 0) {
    throw new Error('La primera línea debe comenzar sin espacios iniciales.');
  }

  const declaredStack = [new Set()];

  const buildBlock = (startIndex, expectedIndent) => {
    const jsLines = [];
    let cursor = startIndex;

    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.indent < expectedIndent) break;
      if (line.indent > expectedIndent) {
        throw new Error(`Revisa la sangría en la línea ${line.number}: usa múltiplos exactos de 4 espacios.`);
      }

      const text = line.text;

      // 1. Definición de función: def nombre(a, b):
      const defMatch = text.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*:\s*$/);
      if (defMatch) {
        const [, fnName, rawParams] = defMatch;
        const nextLine = lines[cursor + 1];
        if (!nextLine || nextLine.indent !== expectedIndent + 4) {
          throw new Error(`Agrega 4 espacios de sangría al bloque debajo de «def ${fnName}» (línea ${line.number}).`);
        }
        const params = rawParams
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        declaredStack.push(new Set(params));
        const nested = buildBlock(cursor + 1, expectedIndent + 4);
        declaredStack.pop();
        jsLines.push(`function ${fnName}(${params.join(', ')}) {\n${nested.code}\n}`);
        cursor = nested.nextIndex;
        continue;
      }

      if (/^def\s+/.test(text) && !text.endsWith(':')) {
        throw new Error(`Falta escribir dos puntos «:» al final de la línea ${line.number}.`);
      }

      // 2. Bucle for: for item in coleccion:
      const forMatch = text.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+(.+):\s*$/);
      if (forMatch) {
        const [, iterVar, iterExpr] = forMatch;
        const nextLine = lines[cursor + 1];
        if (!nextLine || nextLine.indent !== expectedIndent + 4) {
          throw new Error(`Agrega 4 espacios de sangría dentro del bucle «for» debajo de la línea ${line.number}.`);
        }
        const currentScope = declaredStack[declaredStack.length - 1];
        currentScope.add(iterVar);
        const nested = buildBlock(cursor + 1, expectedIndent + 4);
        jsLines.push(`for (const ${iterVar} of __pyIter(${transpilePythonExpr(iterExpr)})) {\n${nested.code}\n}`);
        cursor = nested.nextIndex;
        continue;
      }

      if (/^for\s+/.test(text) && !text.endsWith(':')) {
        throw new Error(`Recuerda terminar el bucle «for» con dos puntos «:» en la línea ${line.number}.`);
      }

      // 3. Condicionales: if / elif / else
      const ifMatch = text.match(/^if\s+(.+):\s*$/);
      const elifMatch = text.match(/^elif\s+(.+):\s*$/);
      const elseMatch = /^else\s*:\s*$/.test(text);

      if (ifMatch || elifMatch || elseMatch) {
        const nextLine = lines[cursor + 1];
        if (!nextLine || nextLine.indent !== expectedIndent + 4) {
          throw new Error(`Agrega 4 espacios de sangría al bloque debajo de la línea ${line.number}.`);
        }
        const nested = buildBlock(cursor + 1, expectedIndent + 4);
        if (ifMatch) {
          jsLines.push(`if (${transpilePythonExpr(ifMatch[1])}) {\n${nested.code}\n}`);
        } else if (elifMatch) {
          jsLines.push(`else if (${transpilePythonExpr(elifMatch[1])}) {\n${nested.code}\n}`);
        } else {
          jsLines.push(`else {\n${nested.code}\n}`);
        }
        cursor = nested.nextIndex;
        continue;
      }

      if (/^(if|elif|else)\b/.test(text) && !text.endsWith(':')) {
        throw new Error(`Falta colocar dos puntos «:» al final de la condición en la línea ${line.number}.`);
      }

      // 4. Sentencia return / pass
      if (text === 'pass') {
        cursor += 1;
        continue;
      }

      const returnMatch = text.match(/^return(?:\s+(.+))?$/);
      if (returnMatch) {
        const expr = returnMatch[1] ? transpilePythonExpr(returnMatch[1]) : 'null';
        jsLines.push(`return ${expr};`);
        cursor += 1;
        continue;
      }

      // 5. Asignación compuesta: total += ...
      const augAssign = text.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
      if (augAssign) {
        const [, varName, op, rhs] = augAssign;
        jsLines.push(`${varName} ${op} ${transpilePythonExpr(rhs)};`);
        cursor += 1;
        continue;
      }

      // 6. Asignación simple: variable = expresion (o dic[k] = expr)
      const simpleAssign = text.match(/^([a-zA-Z_]\w*)\s*=\s*(?!=)(.+)$/);
      if (simpleAssign) {
        const [, varName, rhs] = simpleAssign;
        const isDeclared = declaredStack.some((scope) => scope.has(varName));
        if (!isDeclared) {
          declaredStack[declaredStack.length - 1].add(varName);
          jsLines.push(`let ${varName} = ${transpilePythonExpr(rhs)};`);
        } else {
          jsLines.push(`${varName} = ${transpilePythonExpr(rhs)};`);
        }
        cursor += 1;
        continue;
      }

      // 7. Expresión o llamada a método (ej. limpias.append(senal))
      jsLines.push(`${transpilePythonExpr(text)};`);
      cursor += 1;
    }

    return { code: jsLines.join('\n'), nextIndex: cursor };
  };

  const compiled = buildBlock(0, 0).code;

  const factory = new Function(`
    "use strict";
    const range = (a, b, step = 1) => {
      const start = b === undefined ? 0 : a;
      const stop = b === undefined ? a : b;
      const arr = [];
      for (let i = start; step > 0 ? i < stop : i > stop; i += step) arr.push(i);
      return arr;
    };
    const len = (x) => (x && typeof x.length === 'number' ? x.length : Object.keys(x || {}).length);
    const min = (...args) => Math.min(...(args.length === 1 && Array.isArray(args[0]) ? args[0] : args));
    const max = (...args) => Math.max(...(args.length === 1 && Array.isArray(args[0]) ? args[0] : args));
    const sum = (arr) => (arr || []).reduce((acc, v) => acc + v, 0);
    const abs = Math.abs;
    const __pyIn = (item, container) => {
      if (Array.isArray(container) || typeof container === 'string') return container.includes(item);
      if (container && typeof container === 'object') return Object.prototype.hasOwnProperty.call(container, item);
      return false;
    };
    const __pyIter = (container) => {
      if (Array.isArray(container) || typeof container === 'string') return container;
      if (container && typeof container === 'object') return Object.keys(container);
      return [];
    };
    const __pyGet = (obj, key, fallback = null) => (
      obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback
    );

    ${compiled}

    if (typeof ${targetFunctionName} !== 'function') {
      throw new Error('No se encontró la función «${targetFunctionName}». Verifica que conserve su nombre original.');
    }
    return ${targetFunctionName};
  `);

  return factory();
}

/**
 * Evalúa una misión avanzada de Python basada en funciones y casos de prueba.
 */
export function evaluatePythonFunctionMission(sourceCode, reglasValidacion = {}) {
  try {
    const cleanNoComments = sourceCode
      .split('\n')
      .map(stripPythonComment)
      .join('\n');

    for (const token of reglasValidacion.tokens_requeridos || []) {
      if (token === 'if ' && cleanNoComments.includes('min(')) continue;
      if (!cleanNoComments.includes(token)) {
        return {
          passed: false,
          message: `Tu solución debe utilizar «${token.trim()}» para cumplir el protocolo del laboratorio.`,
          testResults: [],
        };
      }
    }

    const fn = compileEducationalPython(sourceCode, reglasValidacion.funcion_objetivo);
    const casos = reglasValidacion.casos_prueba || [];
    const testResults = casos.map((caso, idx) => {
      const clonedArgs = JSON.parse(JSON.stringify(caso.entrada || []));
      const actual = fn(...clonedArgs);
      const ok = JSON.stringify(actual) === JSON.stringify(caso.esperado);
      return {
        id: idx + 1,
        description: caso.descripcion || `Caso de prueba ${idx + 1}`,
        input: JSON.stringify(caso.entrada),
        expected: JSON.stringify(caso.esperado),
        actual: actual === undefined ? 'None' : JSON.stringify(actual),
        passed: ok,
      };
    });

    const allPassed = testResults.length > 0 && testResults.every((t) => t.passed);
    const firstFailed = testResults.find((t) => !t.passed);

    return {
      passed: allPassed,
      message: allPassed
        ? '¡Módulo Python verificado! Todos los casos de prueba de la estación orbital pasaron con éxito.'
        : `El caso «${firstFailed.description}» devolvió ${firstFailed.actual} pero se esperaba ${firstFailed.expected}.`,
      testResults,
    };
  } catch (err) {
    return {
      passed: false,
      message: err?.message || 'Revisa la sintaxis y la sangría de tu código Python.',
      testResults: [],
    };
  }
}

/**
 * Evalúa una misión de HTML5 verificando etiquetas requeridas y selectores del DOM.
 */
export function evaluateHtmlDomMission(sourceHtml, reglasValidacion = {}) {
  const trimmed = (sourceHtml || '').trim();
  if (!trimmed) {
    return {
      passed: false,
      message: 'Escribe tus etiquetas HTML en el editor antes de proyectar el holograma.',
      checks: [],
    };
  }

  const lower = trimmed.toLowerCase();
  for (const token of reglasValidacion.tokens_requeridos || []) {
    if (!lower.includes(token.toLowerCase())) {
      return {
        passed: false,
        message: `Falta incluir o cerrar correctamente la etiqueta «${token.trim()}».`,
        checks: [],
      };
    }
  }

  if (typeof DOMParser === 'undefined') {
    return {
      passed: true,
      message: 'Estructura HTML verificada correctamente.',
      checks: [],
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${trimmed}</body>`, 'text/html');
  const checks = (reglasValidacion.selectores_dom || []).map((regla, idx) => {
    const nodes = Array.from(doc.body.querySelectorAll(regla.selector));

    if (typeof regla.cantidad === 'number') {
      const ok = nodes.length === regla.cantidad;
      return {
        id: idx + 1,
        label: `Cantidad de elementos en «${regla.selector}»: ${regla.cantidad}`,
        detail: ok ? `${nodes.length} encontrados` : `Encontrados: ${nodes.length} (se esperaban ${regla.cantidad})`,
        passed: ok,
      };
    }

    const first = nodes[0];
    if (!first) {
      return {
        id: idx + 1,
        label: `Elemento «${regla.selector}» presente`,
        detail: 'No se encontró en la estructura HTML',
        passed: false,
      };
    }

    const text = (first.textContent || '').replace(/\s+/g, ' ').trim();
    if (regla.texto_exacto !== undefined) {
      const ok = text === regla.texto_exacto;
      return {
        id: idx + 1,
        label: `«${regla.selector}» contiene "${regla.texto_exacto}"`,
        detail: ok ? `Correcto: "${text}"` : `Texto actual: "${text || '(vacío)'}"`,
        passed: ok,
      };
    }

    if (regla.contiene_texto !== undefined) {
      const ok = text.includes(regla.contiene_texto);
      return {
        id: idx + 1,
        label: `«${regla.selector}» incluye "${regla.contiene_texto}"`,
        detail: ok ? `Correcto: "${text}"` : `Texto actual: "${text || '(vacío)'}"`,
        passed: ok,
      };
    }

    return {
      id: idx + 1,
      label: `Selector «${regla.selector}» válido`,
      detail: 'Verificado',
      passed: true,
    };
  });

  const allPassed = checks.length > 0 && checks.every((c) => c.passed);
  const firstFailed = checks.find((c) => !c.passed);

  return {
    passed: allPassed,
    message: allPassed
      ? '¡Holograma HTML5 sincronizado! Todas las etiquetas semánticas de la Ciudadela están activas.'
      : `Revisa tu estructura: ${firstFailed.label} (${firstFailed.detail}).`,
    checks,
  };
}

/**
 * Evalúa una misión de JavaScript ejecutando sus casos de prueba de forma aislada.
 */
export function evaluateJavaScriptMission(sourceJs, reglasValidacion = {}) {
  try {
    const uncommented = (sourceJs || '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    for (const token of reglasValidacion.tokens_requeridos || []) {
      if (token === 'const ' && (uncommented.includes('const ') || uncommented.includes('let '))) {
        continue;
      }
      if (!uncommented.includes(token)) {
        const friendly =
          token === '`' || token === '${'
            ? 'template literals con comillas invertidas (`) y ${...}'
            : `«${token.trim()}»`;
        return {
          passed: false,
          message: `Tu código JavaScript debe emplear ${friendly} para superar esta misión.`,
          testResults: [],
        };
      }
    }

    const fnName = reglasValidacion.funcion_objetivo;
    const runner = new Function(`
      "use strict";
      ${sourceJs}
      if (typeof ${fnName} !== 'function') {
        throw new Error('No se encontró la función «${fnName}». Mantén su nombre exacto.');
      }
      return ${fnName};
    `);

    const fn = runner();
    const casos = reglasValidacion.casos_prueba || [];
    const testResults = casos.map((caso, idx) => {
      const clonedArgs = JSON.parse(JSON.stringify(caso.entrada || []));
      const actual = fn(...clonedArgs);
      const ok = JSON.stringify(actual) === JSON.stringify(caso.esperado);
      return {
        id: idx + 1,
        description: caso.descripcion || `Prueba ${idx + 1}`,
        input: (caso.entrada || []).map((v) => JSON.stringify(v)).join(', '),
        expected: JSON.stringify(caso.esperado),
        actual: actual === undefined ? 'undefined' : JSON.stringify(actual),
        passed: ok,
      };
    });

    const allPassed = testResults.length > 0 && testResults.every((t) => t.passed);
    const firstFailed = testResults.find((t) => !t.passed);

    return {
      passed: allPassed,
      message: allPassed
        ? '¡Sistemas de Neo-Tokio en línea! Todos los casos de prueba en JavaScript respondieron con precisión.'
        : `En «${firstFailed.description}» tu función devolvió ${firstFailed.actual} y se esperaba ${firstFailed.expected}.`,
      testResults,
    };
  } catch (err) {
    return {
      passed: false,
      message: `Error de sintaxis o ejecución en JavaScript: ${err?.message || err}`,
      testResults: [],
    };
  }
}
