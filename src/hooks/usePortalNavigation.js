import { useCallback, useState } from 'react';

export const STUDENT_TAB_LABELS = {
  overview: 'Resumen',
  learn: 'Módulos y Mundos',
  labs: 'Práctica y Retos',
  progress: 'Progreso y Glosario',
};

export const TEACHER_TAB_LABELS = {
  overview: 'Resumen y Grupo',
  courses: 'Cursos y Matrícula',
  assignments: 'Retos y Entregas',
  analytics: 'Analítica SQL e IA',
};

export const LANDING_TAB_LABELS = {
  overview: 'Inicio y Propósito',
  methodology: 'Metodología Paso a Paso',
  worlds: '7 Mundos y Lenguajes',
  community: 'Estudiantes y Colegios',
};

/**
 * Construye el rastro de migas de pan (breadcrumbs) según el rol y vista activa.
 */
export function buildBreadcrumbs({
  user,
  view,
  activeSkill,
  activeAssignment,
  activePython,
  activeCodeWorld,
  studentTab,
  teacherTab,
  landingTab,
  onHome,
}) {
  if (!user) {
    return [
      { id: 'landing-root', label: 'CodeKids', onClick: landingTab !== 'overview' ? onHome : undefined },
      { id: 'landing-tab', label: LANDING_TAB_LABELS[landingTab] || LANDING_TAB_LABELS.overview },
    ];
  }

  if (user.role === 'teacher') {
    return [
      { id: 'teacher-root', label: 'Consola Docente', onClick: teacherTab !== 'overview' ? onHome : undefined },
      { id: 'teacher-tab', label: TEACHER_TAB_LABELS[teacherTab] || TEACHER_TAB_LABELS.overview },
    ];
  }

  const crumbs = [
    {
      id: 'student-root',
      label: 'Portal Explorador',
      onClick:
        studentTab !== 'overview' || view !== 'home' || activeSkill || activePython || activeCodeWorld || activeAssignment
          ? onHome
          : undefined,
    },
  ];

  if (activePython) {
    crumbs.push({ id: 'lab-py', label: 'Laboratorio Python' });
  } else if (activeCodeWorld) {
    crumbs.push({
      id: 'lab-world',
      label: activeCodeWorld.worldSlug === 'ciudadela-html' ? 'Ciudadela HTML5' : 'Neo-Tokio JS',
    });
  } else if (activeSkill) {
    crumbs.push({ id: 'lab-blockly', label: 'Misión Blockly' });
  } else if (activeAssignment) {
    crumbs.push({ id: 'lab-assignment', label: activeAssignment.assignment?.title || 'Reto Escolar' });
  } else if (view === 'assessment') {
    crumbs.push({ id: 'student-assessment', label: 'Diagnóstico Computacional' });
  } else if (view === 'result') {
    crumbs.push({ id: 'student-result', label: 'Resultado del Diagnóstico' });
  } else {
    crumbs.push({
      id: 'student-tab',
      label: STUDENT_TAB_LABELS[studentTab] || STUDENT_TAB_LABELS.overview,
    });
  }

  return crumbs;
}

/**
 * Orquesta el estado de navegación multi-vista para landing pública, estudiante y docente,
 * manteniendo el progreso y estado de sesión intactos entre transiciones.
 */
export function usePortalNavigation() {
  const [studentTab, setStudentTab] = useState('overview');
  const [selectedLearnSkill, setSelectedLearnSkill] = useState('Secuencias');
  const [teacherTab, setTeacherTab] = useState('overview');
  const [landingTab, setLandingTab] = useState('overview');

  const navigateStudentTab = useCallback((tab, skill = '') => {
    setStudentTab(tab || 'overview');
    if (skill) setSelectedLearnSkill(skill);
  }, []);

  const navigateTeacherTab = useCallback((tab) => {
    setTeacherTab(tab || 'overview');
  }, []);

  const navigateLandingTab = useCallback((tab) => {
    setLandingTab(tab || 'overview');
  }, []);

  const resetNavigation = useCallback(() => {
    setStudentTab('overview');
    setTeacherTab('overview');
    setLandingTab('overview');
  }, []);

  return {
    studentTab,
    selectedLearnSkill,
    setSelectedLearnSkill,
    teacherTab,
    landingTab,
    navigateStudentTab,
    navigateTeacherTab,
    navigateLandingTab,
    resetNavigation,
    buildBreadcrumbs,
  };
}
