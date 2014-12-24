package controllers

import model.Duck
import play.api.mvc._
import play.api.templates.Html
import cliwe.{DevCacheOnlyPersistence, JavaScriptEngine, CliweShell}

object Application extends Controller with CliweShell with JavaScriptEngine with DevCacheOnlyPersistence {

  def index = Action {
    Ok(views.html.main("Cliwe!"))
  }

  override def renderResult: PartialFunction[ResultWithId, Html] = {
    case ResultWithId(duck: Duck, duckId) => views.html.duck(duck, duckId)
    case ResultWithId(aSequence: Seq[_], sequenceId) => views.html.sequence(aSequence, sequenceId)
    case ResultWithId(aInt: Int, intId) => Html(s"$intId = $aInt: Int")
  }
}
