'use strict';
// Sequelize：Node.js用のpromised-basedのORM（ORマッパーのこと）
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Shop extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Shop.init({
    shop: {
      type: DataTypes.STRING,
      unique: true
    },
    accessToken: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Shop',
  });
  return Shop;
};