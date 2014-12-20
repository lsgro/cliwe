package cliwe

import play.api.Play.current
import play.api.cache.Cache

import javax.script.{ScriptContext, ScriptEngineManager, ScriptEngine}

import scala.annotation.tailrec

trait JavaScriptEngine {

  // persistence
  def loadLastResultNumber(sessionUniqueId: String): Option[Int]
  def saveLastResultNumber(sessionUniqueId: String, n: Int): Unit

  def executeOrHint(fragment: String, context: ScriptContext, sessionUniqueId: String): ScriptResult =
    if (fragment.endsWith("\n")) {
      val result = scriptExecutor(sessionUniqueId).eval(fragment, context)
      val trimmedFragment = fragment.trim
      val resultId = if (isBareIdentifier(trimmedFragment)) {
        trimmedFragment // identifier already present in context
      } else {
        nextResultId(sessionUniqueId, context)
      }
      ScriptValue(result, resultId)
    } else {
      ScriptCompletions(Nil)
    }

  private def scriptExecutor(sessionUniqueId: String): ScriptEngine = Cache.getOrElse(s"cliweScriptEngine-$sessionUniqueId") {
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

}
