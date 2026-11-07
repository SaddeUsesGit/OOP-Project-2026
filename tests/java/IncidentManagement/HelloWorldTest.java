package IncidentManagement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class HelloWorldTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void java21ExampleCompilesAndRunsWithConsoleOutput() throws Exception {
        assertEquals(21, Runtime.version().feature());
        // Maven's test lifecycle compiles the real application sources first.
        Path classes = Path.of("classes").toAbsolutePath();
        assertTrue(Files.isRegularFile(classes.resolve("IncidentManagement/HelloWorld.class")),
                "The Hello World example must be compiled from the application sources");

        Path stdout = temporaryDirectory.resolve("stdout");
        Path stderr = temporaryDirectory.resolve("stderr");
        Path java = Path.of(System.getProperty("java.home"), "bin", "java");
        Process process = new ProcessBuilder(java.toString(), "-cp", classes.toString(),
                "IncidentManagement.HelloWorld")
                .directory(temporaryDirectory.toFile())
                .redirectOutput(stdout.toFile())
                .redirectError(stderr.toFile())
                .start();
        try {
            process.getOutputStream().close();
            assertTrue(process.waitFor(10, TimeUnit.SECONDS), "The example must finish");
            assertEquals(0, process.exitValue(), () -> "Execution failed: " + readDiagnostics(stderr));
            assertTrue(Files.size(stdout) > 0, "The example must emit standard output");
        } finally {
            process.destroyForcibly();
            process.waitFor();
        }
    }

    private static String readDiagnostics(Path stderr) {
        try {
            return Files.readString(stderr);
        } catch (java.io.IOException exception) {
            return exception.toString();
        }
    }
}
