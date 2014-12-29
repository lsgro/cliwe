name := "cliwe-sample"

version := "1.0-SNAPSHOT"

resolvers += Resolver.sonatypeRepo("public")

libraryDependencies ++= Seq(
  jdbc,
  anorm,
  cache,
  "com.github.lsgro" % "cliwe_2.10" % "1.0-SNAPSHOT"
)     

play.Project.playScalaSettings
