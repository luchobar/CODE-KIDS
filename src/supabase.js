/**
 * Facade de compatibilidad hacia la capa de datos modular (`src/data/*`).
 * Mantiene desacoplado el bundle del navegador respecto a `src/services/db.client.js`.
 */

export { callTier2Api } from './data/httpClient.js';
export {
  isSupabaseConfigured,
  supabase,
  supabaseAnonKey,
  supabaseUrl,
} from './data/supabaseClient.js';
export { QUICK_PROFILE_IDS, UNIVERSITY_ACCOUNTS } from './data/seedData.js';
export {
  authenticateUser,
  deactivateUserAccountRemote as deactivateUserAccountInSupabase,
  registerUser,
  updatePasswordForEmail,
} from './data/authRepository.js';
export {
  loadStudentFromSupabase,
  syncAvatarPurchase,
  syncAvatarSelection,
  syncMissionSuccess,
} from './data/studentRepository.js';
export {
  inyectarPaqueteExpansion,
  loadExpansionFromSupabase,
} from './data/expansionRepository.js';
export {
  createCourseInSupabase,
  loadTeacherClassroomData,
  setStudentCourseEnrollment,
} from './data/classroomRepository.js';
export {
  createClassroomAssignmentInSupabase,
  deleteClassroomAssignmentInSupabase,
  gradeSubmissionInSupabase,
  syncAssignmentSubmissionInSupabase,
  updateClassroomAssignmentInSupabase,
} from './data/assignmentsRepository.js';
export {
  getAllAnalyticalReports,
  getAtRiskStudentsReport,
  getClassroomRanking,
  getGamifiedEconomyReport,
  getHighRetryMissionsReport,
} from './data/reportsRepository.js';
