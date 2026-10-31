
package IncidentManagement;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.ArrayList;
public class IncidentFileManager {
    private static final String FILE_NAME = "incidents.dat";
    // Save all incidents to a file
    public static void saveIncidents() {
        try (ObjectOutputStream out = new ObjectOutputStream(
                new FileOutputStream(FILE_NAME))) {
            out.writeObject(User.incidents);
        } catch (IOException e) {
            System.out.println("Error saving incidents: " + e.getMessage());
        }
    }
    // Load incidents when the program starts
    @SuppressWarnings("unchecked")
    public static void loadIncidents() {
        try (ObjectInputStream in = new ObjectInputStream(
                new FileInputStream(FILE_NAME))) {
            ArrayList<Incident> savedIncidents =
                    (ArrayList<Incident>) in.readObject();
            User.incidents.clear();
            User.incidents.addAll(savedIncidents);

int maxId = 0;

for (Incident i : User.incidents) {
    if (i.getId() > maxId) {
        maxId = i.getId();
    }
}

Incident.setNextId(maxId + 1);
            System.out.println("Previous incidents loaded successfully.");
        } catch (java.io.FileNotFoundException e) {
            System.out.println("No previous incidents found. Starting fresh.");
        } catch (IOException | ClassNotFoundException | ClassCastException e) {
            System.out.println("Could not load incidents: " + e.getMessage());
        }
    }
}
