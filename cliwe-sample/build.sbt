name := "cliwe-sample"

version := "1.0"

libraryDependencies ++= Seq(
  jdbc,
  anorm,
  cache
)     

play.Project.playScalaSettings

resolvers += Resolver.sonatypeRepo("public")

libraryDependencies += "com.github.lsgro" % "cliwe_2.10" % "1.1.2"
