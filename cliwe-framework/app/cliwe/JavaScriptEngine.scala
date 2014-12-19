package cliwe

import java.util.concurrent.Callable
import javax.script.{ScriptContext, ScriptEngineManager, ScriptEngine}

import play.cache.Cache

import scala.annotation.tailrec

trait JavaScriptEngine {
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

  private def scriptExecutor(sessionUniqueId: String): ScriptEngine = Cache.getOrElse("cliweScriptEngine", new Callable[ScriptEngine] {
    def call = { new ScriptEngineManager(null).getEngineByName("JavaScript") }
  }, 0)

  private lazy val identifierRegex = """[a-zA-Z$_][0-9a-zA-Z$_]*""".r
  def isBareIdentifier(fragment: String) = identifierRegex.pattern.matcher(fragment).matches()

  private def nextResultId(sessionUniqueId: String, context: ScriptContext): String = {
    val resNumberCandidate = Option(Cache.get(s"resNo-$sessionUniqueId").asInstanceOf[Int]).map(_ + 1).getOrElse(0)
    val resNumber = findFirstUnusedResVariableNumber(resNumberCandidate, context) // avoid conflicts with user variables
    Cache.set(s"resNo-$sessionUniqueId", resNumber)
    s"res$resNumber"
  }

  @tailrec
  private def findFirstUnusedResVariableNumber(n: Int, context: ScriptContext): Int = if (context.getAttribute(s"res$n") == null) n
  else findFirstUnusedResVariableNumber(n + 1, context)

}
