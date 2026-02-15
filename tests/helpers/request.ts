export const bearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
