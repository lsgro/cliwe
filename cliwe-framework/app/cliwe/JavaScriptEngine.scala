package cliwe

import java.io.StringWriter
import javax.script.SimpleScriptContext
import javax.script.ScriptContext._
import javax.script.{ScriptContext, ScriptEngineManager, ScriptEngine}

import scala.annotation.tailrec
import scala.reflect.ClassTag
import scala.util.{Failure, Success, Try}

trait JavaScriptEngine {

  // initialize script context with bootstrap objects
  def scriptContextInitializers: Seq[(String, Any)]

  // to be implemented by client code to provide context sensitive completions
  def generateTopLevelCompletions(fragment: String): Seq[CompletionFragment]
  def generateCompletions(value: Any, trailingFragment: String): Seq[CompletionFragment]

  // persistence
  def loadLastResultNumber(sessionUniqueId: String): Option[Int]
  def saveLastResultNumber(sessionUniqueId: String, n: Int): Unit

  def loadScriptContext(sessionUniqueId: String): Option[ScriptContext]
  def saveScriptContext(sessionUniqueId: String, context: ScriptContext): Unit

  // cache
  def getOrElseObject[T](id: String)(generator: =>T)(implicit ct: ClassTag[T]): T

  def generateScriptResponse(fragment: String, sessionUniqueId: String): ScriptResponse = {
    val context = getOrElseContext(sessionUniqueId)
    if (fragment.endsWith("\n")) {
      val outputWriter = new StringWriter()
      val errorWriter = new StringWriter()
      context.setWriter(outputWriter)
      context.setErrorWriter(errorWriter)
      val result = scriptExecutor(sessionUniqueId).eval(fragment, context)
      val stderr = errorWriter.toString
      val stdout = outputWriter.toString
      val trimmedFragment = fragment.trim
      val resultId = if (isBareIdentifier(trimmedFragment)) {
        trimmedFragment // using a bare identifier: assume that it is already present in script context
      } else {
        val resultId = nextResultId(sessionUniqueId, context)
        context.setAttribute(resultId, result, ENGINE_SCOPE)
        resultId
      }
      ScriptResult(result, resultId, stderr, stdout)
    } else {
      val completionFragments = extractTargetIdAndTrailingFragment(fragment) match {
        case (Some(targetId), trailingFragment) =>
          if (containsFunctionCalls(targetId)) Nil // never evaluate functions
          else {
            Try(scriptExecutor(sessionUniqueId).eval(targetId, context)) match {
              case Success(null) => Nil
              case Success(value) => generateCompletions(value, trailingFragment)
              case _: Failure[_] => Nil
            }
          }
        case (None, trailingFragment) =>
          generateTopLevelCompletions(trailingFragment)
        case _ => Nil
      }
      ScriptCompletions(completionFragments)
    }
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

  private def containsFunctionCalls(fragment: String) = fragment.contains("(")

  private def extractTargetIdAndTrailingFragment(fragment: String): (Option[String], String) = {
    val lastFragment = fragment.split("\\s+").last
    if (lastFragment.contains(".")) {
      lastFragment.split("\\.").toSeq match {
        case Seq(singleToken) => (Some(singleToken), "")
        case tokens => (Some(tokens.init.mkString(".")), tokens.last)
      }
    } else (None, lastFragment)
  }

  private def getOrElseContext(sessionUniqueId: String): ScriptContext = {
    loadScriptContext(sessionUniqueId).getOrElse{
      val context = new SimpleScriptContext
      scriptContextInitializers.foreach {
        case (id, value) => context.setAttribute(id, value, ENGINE_SCOPE)
      }
      saveScriptContext(sessionUniqueId, context)
      context
    }
  }
}
