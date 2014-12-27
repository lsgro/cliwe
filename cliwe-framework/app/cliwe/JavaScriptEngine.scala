package cliwe

import java.io.StringWriter
import javax.script.SimpleScriptContext
import javax.script.ScriptContext._
import javax.script.{ScriptContext, ScriptEngineManager, ScriptEngine}

import scala.annotation.tailrec
import scala.reflect.ClassTag

trait JavaScriptEngine {

  // persistence
  def loadLastResultNumber(sessionUniqueId: String): Option[Int]
  def saveLastResultNumber(sessionUniqueId: String, n: Int): Unit

  def loadScriptContext(sessionUniqueId: String): Option[ScriptContext]
  def saveScriptContext(sessionUniqueId: String, context: ScriptContext): Unit

  // cache
  def getOrElseObject[T](id: String)(generator: =>T)(implicit ct: ClassTag[T]): T

  def generateScriptResponse(fragment: String, sessionUniqueId: String): ScriptResponse =
    if (fragment.endsWith("\n")) {
      val context = getOrElseContext(sessionUniqueId)
      val outputWriter = new StringWriter()
      val errorWriter = new StringWriter()
      context.setWriter(outputWriter)
      context.setErrorWriter(errorWriter)
      val result = scriptExecutor(sessionUniqueId).eval(fragment, context)
      val stderr = errorWriter.toString
      val stdout = outputWriter.toString
      val trimmedFragment = fragment.trim
      val resultId = if (isBareIdentifier(trimmedFragment)) {
        trimmedFragment // identifier already present in context
      } else {
        nextResultId(sessionUniqueId, context)
      }
      registerInContext(resultId, result, context)
      ScriptResult(result, resultId, stderr, stdout)
    } else {
      ScriptCompletions(Nil)
    }

  private def scriptExecutor(sessionUniqueId: String): ScriptEngine = getOrElseObject(s"cliweScriptEngine-$sessionUniqueId") {
    new ScriptEngineManager(null).getEngineByName("JavaScript")
  }

  private lazy val identifierRegex = """[a-zA-Z$_][0-9a-zA-Z$_]*""".r
  def isBareIdentifier(fragment: String) = identifierRegex.pattern.matcher(fragment).matches()

  private def nextResultId(sessionUniqueId: String, context: ScriptContext): String = {
    val resNumberCandidate = loadLastResultNumber(sessionUniqueId).map(_ + 1).getOrElse(0)
    val resNumber = findFirstUnusedResVariableNumber(resNumberCandidate, context) // avoid conflicts with user variables
    saveLastResultNumber(sessionUniqueId, resNumber)
    s"res$resNumber"
  }

  @tailrec
  private def findFirstUnusedResVariableNumber(n: Int, context: ScriptContext): Int = if (context.getAttribute(s"res$n") == null) n
  else findFirstUnusedResVariableNumber(n + 1, context)

  private def registerInContext(id: String, obj: Any, context: ScriptContext) {
    context.setAttribute(id, obj, ENGINE_SCOPE)
  }

  private def getOrElseContext(sessionUniqueId: String): ScriptContext = {
    loadScriptContext(sessionUniqueId).getOrElse{
      val context = new SimpleScriptContext
      saveScriptContext(sessionUniqueId, context)
      context
    }
  }
}
