name := "cliwe"

organization := "com.github.lsgro"

version := "1.1.1"

libraryDependencies ++= Seq(
  cache
)     

scalacOptions += "-target:jvm-1.7"

play.Project.playScalaSettings
