package cliwe

sealed trait ScriptResult

case class ScriptValue(value: AnyRef, id: String) extends ScriptResult
case class ScriptCompletions(commandFragments: Seq[String]) extends ScriptResult
