// Middleware untuk memvalidasi token otentikasi pada request yang membutuhkan login
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Akses ditolak: Token autentikasi tidak ditemukan',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];

  // Nanti jika sudah menggunakan JWT asli:
  // jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { ... })
  
  // Sementara untuk pengujian mock:
  if (token.startsWith('hcm-mock-token') || token.startsWith('dummy-token')) {
    req.user = {
      token,
      // User context yang ditempel ke request
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    code: 'INVALID_TOKEN',
    message: 'Token tidak valid atau sudah kedaluwarsa',
    data: null,
  });
};

module.exports = authMiddleware;
