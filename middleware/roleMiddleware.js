exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Access denied: User authentication failed. Please log in and try again." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied: You do not have permission to perform this action. Required roles: ${roles.join(", ")}`
      });
    }
    next();
  };
};