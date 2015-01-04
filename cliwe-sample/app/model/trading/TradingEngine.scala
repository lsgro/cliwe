package model.trading

class TradingEngine {
  var position = Position(0, 0)
  val quoteGenerator = new QuoteGenerator(1, 100, 1, 1, 0.05)
  var lastQuote: Quote = tick

  def tick: Quote = {
    lastQuote = quoteGenerator.nextQuote
    lastQuote
  }
  def trade(quantity: Int): Position = {
    val price = if (quantity > 0) lastQuote.ask else lastQuote.bid
    position = position.executeTrade(Trade(quantity, price))
    position
  }
  def buy(quantity: Int): Position = {
    trade(quantity)
  }
  def sell(quantity: Int): Position = {
    trade(-quantity)
  }
}
