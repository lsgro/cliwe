package controllers

import model.trading.TradingEngine
import model.Duck
import play.api.mvc._
import play.api.templates.Html
import cliwe.{CompletionFragment, DevCacheOnlyPersistence, JavaScriptEngine, CliweShell}

object CliweSample extends Controller with CliweShell with JavaScriptEngine with DevCacheOnlyPersistence {

  def index = Action {
    Ok(views.html.main("Cliwe!"))
  }

  def quote(engineId: String) = Action {
    request =>
      val sessionUniqueId = getOrElseUniqueId(request)
      loadScriptContext(sessionUniqueId).flatMap {
        context =>
          Option(context.getAttribute(engineId).asInstanceOf[TradingEngine]).map {
            engine =>
              engine.tick
              Ok("""{"bid": %f, "ask": %f, "money": %f, "asset": %d}""".format(engine.lastQuote.bid, engine.lastQuote.ask, engine.position.money, engine.position.asset))
          }
      }.getOrElse(Ok("{}")).withSession("uniqueId" -> sessionUniqueId)
  }

  override def renderResult: PartialFunction[ResultWithId, Html] = {
    case ResultWithId(tradingEngine: TradingEngine, id) => views.html.tradingEngine(tradingEngine, id)
    case ResultWithId(duck: Duck, id) => views.html.duck(duck, id)
    case ResultWithId(aSequence: Seq[_], id) => views.html.sequence(aSequence, id)
    case ResultWithId(aInt: Int, id) => Html(s"$id = $aInt: Int")
  }

  override def scriptContextInitializers: Seq[(String, Any)] = Seq(("te", new TradingEngine))

  val topLevelObjectIds = Seq("te")

  override def generateTopLevelCompletions(fragment: String): Seq[CompletionFragment] = topLevelObjectIds.filter(_.startsWith(fragment)).map {
    topLevelObject =>
      CompletionFragment(topLevelObject, fragment.length)
  }

  val tradingEngineMethods = Seq("position()", "lastQuote()", "buy(", "sell(", "tick()")

  override def generateCompletions(value: Any, trailingFragment: String): Seq[CompletionFragment] = value match {
    case d: Duck if "quack()".startsWith(trailingFragment) =>
      Seq(CompletionFragment("quack()", trailingFragment.length))
    case te: TradingEngine if tradingEngineMethods.exists(_.startsWith(trailingFragment)) =>
      tradingEngineMethods.filter(_.startsWith(trailingFragment)).map {
        method =>
          CompletionFragment(method, trailingFragment.length)
      }
    case _ => Nil
  }

  override def assetsAt: String => Call = routes.Assets.at _
}
