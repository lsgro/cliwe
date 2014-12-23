package cliwe

import java.io.{PrintWriter, StringWriter}
import java.util.UUID
import javax.script.{SimpleScriptContext, ScriptContext}
import javax.script.ScriptContext._

import play.api.mvc._
import play.api.mvc.Results.{Ok, BadRequest}
import play.api.templates.Html

import scala.util.{Failure, Success, Try}

trait CliweShell {

  // script framework
  def executeOrHint(fragment: String, context: ScriptContext, sessionUniqueId: String): ScriptResult

  // client code
  def renderResult: PartialFunction[(Any, String), Html]

  // persistence
  def loadScriptContext(sessionUniqueId: String): Option[ScriptContext]
  def saveScriptContext(sessionUniqueId: String, context: ScriptContext): Unit

  // action
  def shell = Action {
    request =>
      val sessionUniqueId = getOrElseUniqueId(request)
      val responseData = request.body.asFormUrlEncoded.map(_.toSeq).collect {
        case Seq(("commandBuffer", Seq(commandBuffer))) =>
          Ok(applyScriptFragment(commandBuffer, sessionUniqueId))
      }
      responseData.getOrElse(BadRequest("commandBuffer argument not set")).withSession("uniqueId" -> sessionUniqueId)
  }

  private def applyScriptFragment(fragment: String, sessionUniqueId: String): Html = {
    val context = getOrElseContext(sessionUniqueId)
    val outputWriter = new StringWriter()
    val errorWriter = new StringWriter()
    context.setWriter(outputWriter)
    context.setErrorWriter(errorWriter)
    val html = Try(executeOrHint(fragment, context, sessionUniqueId)) match {
      case Success(ScriptValue(result, resultId)) =>
        registerInContext(result, resultId, context)
        val output = outputWriter.toString
        val error = errorWriter.toString
        val renderedResult = renderResultWithDefault(result, resultId)
        cliwe.views.html.response(cliwe.views.html.outandresult(error, output, renderedResult))
      case Success(ScriptCompletions(suggestions)) =>
        cliwe.views.html.menu(suggestions)
      case Failure(exception) =>
        cliwe.views.html.response(cliwe.views.html.stacktrace(extractStackTrace(exception)))
    }
    saveScriptContext(sessionUniqueId, context)
    html
  }

  private def renderResultWithDefault(result: Any, resultId: String) =
    if (renderResult.isDefinedAt(result, resultId)) renderResult(result, resultId)
    else Html(
      result match {
        case null => "null"
        case other => other.toString
      }
    )

  private def getOrElseUniqueId(request: Request[_]): String = request.session.get("uniqueId").getOrElse(UUID.randomUUID().toString)

  private def extractStackTrace(exception: Throwable) = {
    val stackTraceBuffer = new StringWriter()
    val stackTraceWriter = new PrintWriter(stackTraceBuffer)
    exception.printStackTrace(stackTraceWriter)
    stackTraceBuffer.toString
  }

  private def registerInContext(obj: Any, id: String, context: ScriptContext) {
    context.setAttribute(id, obj, ENGINE_SCOPE)
  }

  private def getOrElseContext(sessionUniqueId: String): ScriptContext = {
    loadScriptContext(sessionUniqueId).getOrElse(new SimpleScriptContext)
  }
}
