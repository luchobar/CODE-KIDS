import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import {
  addSeedProgram,
  BLOCKLY_GRID_COLOUR,
  BLOCKLY_MAX_BLOCKS,
  BLOCKLY_TOOLBOXES,
  buildActionQueue,
  ensureBlocklyRegistered,
  evaluateBlocklyOutcome,
} from '../engines/blocklyConfig.js';
import { playSnapTone } from './useAudioEffects.js';
import { isCompactViewport } from './useCodeSnippetEditor.js';

ensureBlocklyRegistered();

/**
 * Orquesta el ciclo de vida del espacio de trabajo Blockly, la reproducción paso a paso
 * y la limpieza segura de temporizadores al cambiar de misión o desmontar.
 */
export function useBlocklyWorkspace({ mission, lessonHintsLength, onComplete, soundEnabled }) {
  const hostRef = useRef(null);
  const workspaceRef = useRef(null);
  const pausedRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  const cancelledRef = useRef(false);
  const timersRef = useRef([]);

  const [position, setPosition] = useState(mission.start);
  const [trail, setTrail] = useState([{ x: mission.start.x, y: mission.start.y }]);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stepCursor, setStepCursor] = useState(0);
  const [activeBlockLabel, setActiveBlockLabel] = useState('');
  const [blockCount, setBlockCount] = useState(1);
  const [snapPulse, setSnapPulse] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState('editor');

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const clearScheduledTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  const scheduleTimeout = (callback, delayMs) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== id);
      callback();
    }, delayMs);
    timersRef.current.push(id);
    return id;
  };

  const waitManaged = (delayMs) =>
    new Promise((resolve) => {
      scheduleTimeout(resolve, delayMs);
    });

  useEffect(() => {
    cancelledRef.current = false;
    pausedRef.current = false;
    setPosition(mission.start);
    setTrail([{ x: mission.start.x, y: mission.start.y }]);
    setRunning(false);
    setPaused(false);
    setStepCursor(0);
    setActiveBlockLabel('');
    setMessage('');
    setMessageIsError(false);
    setWorkspaceError('');
    setShowConfetti(false);
    setAttempts(0);
    setHintIndex(0);

    if (!hostRef.current) return undefined;

    let workspace = null;
    let resizeObserver = null;
    let handleWorkspaceEvent = null;
    const handleViewportChange = () => {
      window.requestAnimationFrame(() => {
        if (workspaceRef.current && hostRef.current?.offsetWidth) {
          Blockly.svgResize(workspaceRef.current);
        }
      });
    };

    try {
      const toolbox = BLOCKLY_TOOLBOXES[mission.templateId] || BLOCKLY_TOOLBOXES['sequence-order'];
      workspace = Blockly.inject(hostRef.current, {
        toolbox: { kind: 'categoryToolbox', contents: toolbox },
        renderer: 'zelos',
        sounds: false,
        trashcan: true,
        grid: { spacing: 24, length: 3, colour: BLOCKLY_GRID_COLOUR, snap: true },
        zoom: {
          controls: true,
          wheel: true,
          pinch: true,
          startScale: isCompactViewport() ? 0.72 : 0.9,
          maxScale: 1.25,
          minScale: 0.5,
        },
        move: { scrollbars: true, drag: true, wheel: true },
        toolboxPosition: 'start',
        horizontalLayout: false,
        maxBlocks: BLOCKLY_MAX_BLOCKS,
      });

      workspaceRef.current = workspace;
      const start = workspace.newBlock('ck_start');
      start.setDeletable(false);
      start.setMovable(false);
      start.initSvg();
      start.render();
      start.moveBy(22, 24);
      addSeedProgram(workspace, start, mission.seedProgram);
      setBlockCount(workspace.getAllBlocks(false).length);

      handleWorkspaceEvent = (event) => {
        if (!workspaceRef.current) return;
        setBlockCount(workspaceRef.current.getAllBlocks(false).length);
        if (
          event.type === Blockly.Events.BLOCK_MOVE &&
          event.newParentId &&
          event.newParentId !== event.oldParentId
        ) {
          setSnapPulse(true);
          if (soundEnabledRef.current) playSnapTone();
          scheduleTimeout(() => {
            if (!cancelledRef.current) setSnapPulse(false);
          }, 650);
        }
      };
      workspace.addChangeListener(handleWorkspaceEvent);

      resizeObserver = new ResizeObserver(() => {
        if (workspaceRef.current && hostRef.current?.offsetWidth) {
          Blockly.svgResize(workspaceRef.current);
        }
      });
      resizeObserver.observe(hostRef.current);
      window.addEventListener('orientationchange', handleViewportChange);
      window.addEventListener('resize', handleViewportChange);
    } catch {
      setWorkspaceError('No fue posible inicializar el editor visual de bloques en este navegador.');
    }

    return () => {
      cancelledRef.current = true;
      clearScheduledTimers();
      if (workspace && handleWorkspaceEvent) {
        workspace.removeChangeListener(handleWorkspaceEvent);
      }
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('orientationchange', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
      if (workspace) workspace.dispose();
      workspaceRef.current = null;
    };
  }, [mission.id]);

  useEffect(() => {
    if (mobileTab !== 'editor') return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (workspaceRef.current && hostRef.current?.offsetWidth) {
        Blockly.svgResize(workspaceRef.current);
        workspaceRef.current.scrollCenter?.();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mobileTab]);

  const switchMobileTab = (tab) => {
    setMobileTab(tab);
    if (tab === 'editor') {
      scheduleTimeout(() => {
        if (!cancelledRef.current && workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current);
        }
      }, 60);
    }
  };

  const finalizeOutcome = (plan) => {
    if (cancelledRef.current) return;
    const workspace = workspaceRef.current;
    const nextAttempt = attempts + 1;
    const outcome = evaluateBlocklyOutcome(plan, mission, workspace);

    setAttempts(nextAttempt);
    setRunning(false);
    setPaused(false);
    pausedRef.current = false;
    setActiveBlockLabel('');
    if (workspace) workspace.highlightBlock(null);

    if (outcome.success) {
      setShowConfetti(true);
      scheduleTimeout(() => {
        if (!cancelledRef.current) setShowConfetti(false);
      }, 3200);
    }

    setMessage(outcome.feedbackMessage);
    setMessageIsError(outcome.isError);

    onComplete({
      success: outcome.success,
      attempts: nextAttempt,
      evidence: outcome.evidence,
      workspace: outcome.workspaceSnapshot,
    });
  };

  const runProgram = async () => {
    const workspace = workspaceRef.current;
    if (!workspace || running) return;
    if (isCompactViewport()) setMobileTab('stage');

    const plan = buildActionQueue(workspace, mission);
    cancelledRef.current = false;
    setRunning(true);
    setPaused(false);
    pausedRef.current = false;
    setStepCursor(0);
    setMessage('');
    setMessageIsError(false);
    setShowConfetti(false);
    setPosition({ ...mission.start });
    setTrail([{ x: mission.start.x, y: mission.start.y }]);

    for (let i = 0; i < plan.actions.length; i += 1) {
      while (pausedRef.current && !cancelledRef.current) {
        await waitManaged(90);
      }
      if (cancelledRef.current) return;
      const step = plan.actions[i];
      setActiveBlockLabel(step.label);
      if (workspaceRef.current) workspaceRef.current.highlightBlock(step.blockId);
      setPosition({ ...step.snapshot });
      setTrail((prev) => [...prev, { x: step.snapshot.x, y: step.snapshot.y }]);
      await waitManaged(260);
      if (cancelledRef.current) return;
    }

    finalizeOutcome(plan);
  };

  const togglePause = () => {
    if (!running) return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
  };

  const runSingleStep = () => {
    if (running) return;
    if (isCompactViewport()) setMobileTab('stage');

    const plan = buildActionQueue(workspaceRef.current, mission);
    if (!plan.actions.length) {
      finalizeOutcome(plan);
      return;
    }
    const nextIndex = stepCursor < plan.actions.length ? stepCursor : 0;
    if (nextIndex === 0) {
      setMessage('');
      setMessageIsError(false);
      setShowConfetti(false);
      setTrail([{ x: mission.start.x, y: mission.start.y }]);
    }
    const step = plan.actions[nextIndex];
    setActiveBlockLabel(`Paso ${nextIndex + 1}/${plan.actions.length}: ${step.label}`);
    if (workspaceRef.current) workspaceRef.current.highlightBlock(step.blockId);
    setPosition({ ...step.snapshot });
    setTrail((prev) => [...prev, { x: step.snapshot.x, y: step.snapshot.y }]);

    if (nextIndex + 1 >= plan.actions.length) {
      setStepCursor(0);
      finalizeOutcome(plan);
    } else {
      setStepCursor(nextIndex + 1);
    }
  };

  const resetRun = () => {
    if (running && !pausedRef.current) return;
    cancelledRef.current = true;
    clearScheduledTimers();
    pausedRef.current = false;
    setRunning(false);
    setPaused(false);
    setStepCursor(0);
    setActiveBlockLabel('');
    setPosition(mission.start);
    setTrail([{ x: mission.start.x, y: mission.start.y }]);
    setMessage('');
    setMessageIsError(false);
    setShowConfetti(false);
    if (workspaceRef.current) workspaceRef.current.highlightBlock(null);
  };

  const showNextHint = () =>
    setHintIndex((current) => (current >= lessonHintsLength ? 0 : current + 1));

  return {
    hostRef,
    position,
    trail,
    running,
    paused,
    activeBlockLabel,
    blockCount,
    snapPulse,
    showConfetti,
    message,
    messageIsError,
    workspaceError,
    attempts,
    hintIndex,
    mobileTab,
    switchMobileTab,
    runProgram,
    togglePause,
    runSingleStep,
    resetRun,
    showNextHint,
  };
}
