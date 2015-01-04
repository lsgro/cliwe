package model.trading

class TradingEngine {
  var position = Position(0, 0)
  val quoteGenerator = new QuoteGenerator(1, 0, 0.01, 1, 0.05)
  var lastQuote: Quote = Quote(100, 101)

  def tick: Quote = {
    lastQuote = quoteGenerator.nextQuote(lastQuote)
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
