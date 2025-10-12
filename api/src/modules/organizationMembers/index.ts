import organizationMemberController from './organizationMemberController';
import organizationMemberRoutes from './organizationMemberRoutes';
import organizationMemberService from './organizationMemberService';

export { organizationMemberController, organizationMemberRoutes, organizationMemberService };

export default {
  controller: organizationMemberController,
  service: organizationMemberService,
  routes: organizationMemberRoutes,
};
