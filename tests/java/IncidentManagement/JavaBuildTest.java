package IncidentManagement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class JavaBuildTest {
    @Test
    void runsOnJava21InIsolatedBuildDirectory() {
        assertEquals(21, Runtime.version().feature());
        Path cwd = Path.of("").toAbsolutePath().normalize();
        assertTrue(Files.isDirectory(cwd.resolve("test-classes")));
        assertTrue(Files.isDirectory(cwd.resolve("classes")));
    }

    @Test
    void compiledApplicationCreatesDistinctIncidentIdentities() {
        Incident first = new Incident("first", "example", "tester");
        Incident second = new Incident("second", "example", "tester");
        assertNotSame(first, second);
        assertEquals(first.getId() + 1, second.getId());
    }
}
