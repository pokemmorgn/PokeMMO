// server/src/middleware/authMiddleware.ts
export const authMiddleware = (req: any, res: any, next: any) => {
  // Vérifier le token JWT ou session
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  try {
    // Vérifier et décoder le token
    // req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};
