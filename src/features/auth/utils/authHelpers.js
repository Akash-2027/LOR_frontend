export const getDashboardPath = (role) => {
  if (role === 'student') return '/student';
  if (role === 'faculty') return '/faculty';
  if (role === 'admin') return '/admin';
  return '/auth';
};

export const mapAuthPayload = (payload, roleKey) => {
  const user = payload?.[roleKey];
  return {
    token: payload?.token,
    role: user?.role,
    user
  };
};
