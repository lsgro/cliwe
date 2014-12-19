package controllers

import model.Duck
import play.api.mvc._
import play.api.templates.Html
import cliwe.{JavaScriptEngine, CliweShell}

object Application extends Controller with CliweShell with JavaScriptEngine {

  def index = Action {
    Ok(views.html.main("Cliwe!"))
  }

  override def renderResult: PartialFunction[(Any, String), Html] = {
    case (duck: Duck, duckId) => views.html.duck(duck, duckId)
    case (aSequence: Seq[_], sequenceId) => views.html.sequence(aSequence, sequenceId)
    case (aInt: Int, intId) => Html(s"$intId = $aInt: Int")
  }
}
