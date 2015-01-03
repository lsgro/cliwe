package cliwe

import java.io.{PrintWriter, StringWriter}
import java.util.UUID

import play.api.mvc._
import play.api.Play.current
import play.api.cache.Cache
import play.api.mvc.Results.{Ok, BadRequest}
import play.api.templates.Html

import scala.reflect.ClassTag
import scala.util.{Failure, Success, Try}

trait CliweShell {
  case class ResultWithId(result: Any, id: String)

  def generateScriptResponse(fragment: String, sessionUniqueId: String): ScriptResponse

  def renderResult: PartialFunction[ResultWithId, Html]

  // provide Play cache to other traits
  def getOrElseObject[T](id: String)(generator: =>T)(implicit ct: ClassTag[T]): T = Cache.getOrElse(id)(generator)

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

  def applyScriptFragment(fragment: String, sessionUniqueId: String): Html = {
    val html = Try(generateScriptResponse(fragment, sessionUniqueId)) match {
      case Success(ScriptResult(result, resultId, stderr, stdout)) =>
        val renderedResult = renderResultWithDefault(ResultWithId(result, resultId))
        cliwe.views.html.response(cliwe.views.html.outandresult(stderr, stdout, renderedResult))
      case Success(ScriptCompletions(completions)) =>
        cliwe.views.html.menu(completions)
      case Failure(exception) =>
        cliwe.views.html.response(cliwe.views.html.stacktrace(extractStackTrace(exception)))
    }
    html
  }

  def renderResultWithDefault(resultWithId: ResultWithId) =
    if (renderResult.isDefinedAt(resultWithId)) renderResult(resultWithId)
    else Html(
      resultWithId.result match {
        case null => "null"
        case other => s"${resultWithId.id} = $other"
      }
    )

  def getOrElseUniqueId(request: Request[_]): String = request.session.get("uniqueId").getOrElse(UUID.randomUUID().toString)

  def extractStackTrace(exception: Throwable) = {
    val stackTraceBuffer = new StringWriter()
    val stackTraceWriter = new PrintWriter(stackTraceBuffer)
    exception.printStackTrace(stackTraceWriter)
    stackTraceBuffer.toString
  }
}
