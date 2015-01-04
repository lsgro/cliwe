package model.trading

import scala.util.Random

class QuoteGenerator(seed: Int, priceAverage: Double, priceVolatility: Double, spreadAverage: Double, spreadVolatility: Double) {
  val random = new Random(seed)
  def nextMidPrice = random.nextGaussian() * priceVolatility + priceAverage
  def nextSpread = random.nextGaussian() * spreadVolatility + spreadAverage
  def nextQuote = {
    val midPrice = nextMidPrice
    val halfSpread = nextSpread / 2.0
    Quote(midPrice - halfSpread, midPrice + halfSpread)
  }
}

