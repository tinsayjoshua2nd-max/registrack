export const useHelpdesk = () => {
  const login = (_name: string, _password: string) => ({
    success: true,
    error: undefined as string | undefined,
  });

  return {
    loginStudent: login,
    loginAdmin: login,
    loginSuperAdmin: login,
  };
};