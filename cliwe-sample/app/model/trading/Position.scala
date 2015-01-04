package model.trading

case class Position(money: Double, asset: Int) {
  def executeTrade(trade: Trade): Position = copy(
    money = money - trade.quantity * trade.price,
    asset = asset + trade.quantity
  )
}

