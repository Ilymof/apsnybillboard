const rulesPattern = require("../utils/accessRules");

async function getRulesPattern(req, res) {
    try {
            const allRoutes = rulesPattern
            res.json(allRoutes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
  }

module.exports = getRulesPattern