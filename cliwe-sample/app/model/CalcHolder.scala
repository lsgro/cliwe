package model

trait IntCalculation {
  def calculate(x: Int): Int
}

class CalcHolder {
  var calculation: IntCalculation = null;

  def setCalculation(calcul: IntCalculation): Unit = {
    calculation = calcul;
  }
  def perform(x: Int): Int = calculation.calculate(x)
}
