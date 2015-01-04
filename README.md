cliwe
=====

A Play 2 module providing Command Line Interface to web applications.

A powerful way to interact with the backend of your application from a terminal window in the browser.

Features:
- Javascript running on the server
- Access to all server-side classes
- Optionally expose server side live objects
- HTML console allows for customized graphic output
- Customizable code completion dialog
- All interaction happens by issuing commands in the terminals

## Run the sample application

Clone the source repository:

    git clone https://github.com/lsgro/cliwe.git
    
enter the sample application root directory

    cd cliwe/cliwe-sample/
    
in `build.sbt` change the dependency on cliwe to the latest release available on public repository:

    ....
    libraryDependencies += "com.github.lsgro" % "cliwe_2.10" % "1.1.1"
    ....
    
(alternatively compile the library and publish to your local repository)    
    
run sbt and then start the application:

    sbt
    [cliwe-sample] $ run
    
point the browser to `http://localhost:9000`

## Usage

cliwe is currently available in compiled form only for Scala 2.10. Compile from the source if you need to use it with another Scala version.

### Adding the dependency
In your `build.sbt` add the following lines:
    
    resolvers += Resolver.sonatypeRepo("public")
to add the Sonatype repository.
    
    libraryDependencies += "com.github.lsgro" % "cliwe_2.10" % "1.1"
to depend on cliwe.
  
### Adding a console to an HTML page in the client application
Add the following DIVs:

    <div class="cliwe-terminal"></div>

and

    <div class="cliwe-pin-board"></div>

and initialise the cliwe terminal by instantiating the JQuery component:

    <script type="text/javascript">$(function(){$(".cliwe-terminal").cliwe()})</script>

### Mixing-in cliwe in your web application
Mix the trait `CliweShell` in your Play 2 Controller.
Depending on the level of functionality to integrate, choose one of the following options:

#### Javascript shell
The JDK 1.7+ comes with an embedded JavaScript interpreter, available through the Java Scripting API `javax.script`.
The trait `JavaScriptEngine` provides an adapter to use it with cliwe.
Mix the traits `CliweShell` and `JavaScriptEngine` in your Play 2 Controller:

    object Application extends Controller with CliweShell with JavaScriptEngine { ... }

Implement the abstract methods, which are divided in the following concerns:

##### Persistence
The script context and last script result number (an integer) must be available to the HTTP session. The client application must therefore implement the following methods:

    def loadLastResultNumber(sessionUniqueId: String): Option[Int]
    def saveLastResultNumber(sessionUniqueId: String, n: Int): Unit
    def loadScriptContext(sessionUniqueId: String): Option[ScriptContext]
    def saveScriptContext(sessionUniqueId: String, context: ScriptContext): Unit

To simplify prototyping and to build a sample application without having to deal with real persistence, a trait providing an implementation of these four methods is available with the sample application package: `DevCacheOnlyPersistence`. As it can be guessed by the name, this trait uses the Play Cache API, and therefore it should not be used for real applications, since it could forget and the session script context, depending on the cache implementation.

##### Initialisation
Any object that must be available in the script context can be passed in a map, indexed by the identifier in the context, by this method:

    def scriptContextInitializers: Seq[(String, Any)]

A trivial implementation is `Nil`.

##### Code completion
At every keystroke, a message is sent to the script engine, to allow for the generation of code completion suggestions, that are made available to the console in a context menu by the press of CTRL+SPACE. To generate the code completion, the client application must implement the following methods:

    def generateTopLevelCompletions(fragment: String): Seq[CompletionFragment]
    def generateCompletions(value: Any, trailingFragment: String): Seq[CompletionFragment]

The first method is for top-level objects, available in any scope of the script.
The second method should generate code completions based on a dotted syntax. The first argument: `value` is the object on which the property or method is being accessed, i.e. the value before the dot. The second argument is the attribute or method name typed so far, after the dot. For example, at this point of the script editing:

    var d = new Packages.model.Duck()
    d.qua

the method `generateCompletions` will be called with the following arguments:
- value = d (a model.Duck instance)
- trailingFragment = "qua"

For both method, a trivial implementation would be `Nil`, for no code completion.

##### Personalised rendering
When a value is returned by the script engine, for example as the evaluation of an object variable, the client code has the option of intercepting the rendering of the value in the console, and provide a personalised view for it. This is achieved by the implementation of the method:

    def renderResult: PartialFunction[ResultWithId, Html]

If the provided partial function is defined for a specific value, its output will be sent to the console in the browser, instead of the default rendering, obtained by calling `toString` on it.
A trivial implementation, which doesn't provide any personalised rendering, is `PartialFunction.empty`.

#### Raw shell
With this minimal level of functionality, you have to provide an interpreter for the command line interface. For example attaching a Python or Scala engine, instead of the stock JavaScript available with the `JavaScriptEngine` trait.
Mix-in only the `CliweShell` trait:

    object Application extends Controller with CliweShell { ... }

and implement the abstract methods:

    def generateScriptResponse(fragment: String, sessionUniqueId: String): ScriptResponse

    def renderResult: PartialFunction[ResultWithId, Html]
  
The first method is the heart of the shell, and it is invoked for each keystroke in the client console. The return type `ScriptResponse` can be one of two classes:

    case class ScriptResult(value: AnyRef, id: String, stderr: String, stdout: String) extends ScriptResponse
used to return a command result, when the fragment entered is ended by a `'\f'` character.

    case class ScriptCompletions(fragments: Seq[CompletionFragment]) extends ScriptResponse
to return script completions, when the fragment entered is incomplete.

The second method, `renderResult`, has been discussed above.

### Implementing the `assetsAt` method in the client controller
Implement the abstract method:

    override def assetsAt: String => Call = routes.Assets.at _

In fact the cliwe module doesn't specify a Router class, leaving this to the client application. This seems to be necessary to avoid having two `routes` reverse routing classes in the classpath.
