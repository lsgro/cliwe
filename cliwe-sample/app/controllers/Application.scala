package controllers

import javax.script.ScriptContext

import model.{CalcHolder, Duck}
import play.api.mvc._
import play.api.templates.Html
import cliwe.{CompletionFragment, DevCacheOnlyPersistence, JavaScriptEngine, CliweShell}

object Application extends Controller with CliweShell with JavaScriptEngine with DevCacheOnlyPersistence {

  def index = Action {
    Ok(views.html.main("Cliwe!"))
  }

  override def renderResult: PartialFunction[ResultWithId, Html] = {
    case ResultWithId(duck: Duck, duckId) => views.html.duck(duck, duckId)
    case ResultWithId(aSequence: Seq[_], sequenceId) => views.html.sequence(aSequence, sequenceId)
    case ResultWithId(aInt: Int, intId) => Html(s"$intId = $aInt: Int")
  }

  override def scriptContextInitializers: Seq[(String, Any)] = Nil

  override def generateTopLevelCompletions(fragment: String): Seq[CompletionFragment] = Nil

  override def generateCompletions(value: Any, trailingFragment: String): Seq[CompletionFragment] = value match {
    case d: Duck if "quack()".startsWith(trailingFragment) =>
      Seq(CompletionFragment("quack()", trailingFragment.length))
    case _ => Nil
  }
}
