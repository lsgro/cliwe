package cliwe

import javax.script.ScriptContext

import play.api.Play.current
import play.api.cache.Cache

// TODO: dev only - Play cache doesn't retain objects indefinitely - implement a real persistence for production
trait DevCacheOnlyPersistence {
  def loadLastResultNumber(sessionUniqueId: String): Option[Int] = Cache.getAs[Int](s"cliwe-resNo-$sessionUniqueId")
  def saveLastResultNumber(sessionUniqueId: String, n: Int) { Cache.set(s"cliwe-resNo-$sessionUniqueId", n) }

  def loadScriptContext(sessionUniqueId: String): Option[ScriptContext] = Cache.getAs[ScriptContext](s"cliwe-script-context-$sessionUniqueId")
  def saveScriptContext(sessionUniqueId: String, context: ScriptContext) { Cache.set(s"cliwe-script-context-$sessionUniqueId", context) }
}
