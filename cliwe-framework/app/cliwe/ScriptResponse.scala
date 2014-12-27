package cliwe

sealed trait ScriptResponse

case class CompletionFragment(fragment: String, insertionOffset: Int)

case class ScriptResult(value: AnyRef, id: String, stderr: String, stdout: String) extends ScriptResponse
case class ScriptCompletions(fragments: Seq[CompletionFragment]) extends ScriptResponse
