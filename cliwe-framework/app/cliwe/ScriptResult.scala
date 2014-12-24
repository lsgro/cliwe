package cliwe

sealed trait ScriptResult

case class CompletionFragment(fragment: String, insertionOffset: Int)

case class ScriptValue(value: AnyRef, id: String) extends ScriptResult
case class ScriptCompletions(fragments: Seq[CompletionFragment]) extends ScriptResult
