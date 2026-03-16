// Simple Cookie Helper for Authentication

// Set authentication cookie
const setAuthCookie = (res, cookieName, token) => {
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });
};

// Clear authentication cookie
const clearAuthCookie = (res, cookieName) => {
  res.cookie(cookieName, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
};

export { setAuthCookie, clearAuthCookie };
