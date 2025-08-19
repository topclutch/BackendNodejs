import jwt from "jsonwebtoken"

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token de acceso requerido",
      code: "NO_TOKEN",
    })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      let message = "Token inválido"
      let code = "INVALID_TOKEN"

      if (err.name === "TokenExpiredError") {
        message = "Token expirado"
        code = "TOKEN_EXPIRED"
      } else if (err.name === "JsonWebTokenError") {
        message = "Token malformado"
        code = "MALFORMED_TOKEN"
      }

      return res.status(403).json({
        success: false,
        message,
        code,
      })
    }
    req.user = user
    next()
  })
}

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Permisos insuficientes",
      })
    }

    next()
  }
}
