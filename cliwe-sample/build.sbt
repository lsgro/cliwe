name := "cliwe-sample"

version := "1.0-SNAPSHOT"

resolvers += "Local Maven Repository" at "file://"+Path.userHome.absolutePath+"/activator-1.2.12/repository/"

libraryDependencies ++= Seq(
  jdbc,
  anorm,
  cache,
  "funky-shell" % "cliwe_2.10" % "0.5-SNAPSHOT"
)     

play.Project.playScalaSettings
