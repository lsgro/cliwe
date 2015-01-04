package model.trading

import scala.util.Random

class QuoteGenerator(seed: Int, stepAverage: Double, stepVolatility: Double, spreadAverage: Double, spreadVolatility: Double) {
  val random = new Random(seed)
  def nextPriceStep = random.nextGaussian() * stepVolatility + stepAverage
  def nextSpread = random.nextGaussian() * spreadVolatility + spreadAverage
  def nextQuote(previousQuote: Quote) = {
    val bidPrice = previousQuote.bid * (1 + nextPriceStep)
    Quote(bidPrice, bidPrice + nextSpread)
  }
}

