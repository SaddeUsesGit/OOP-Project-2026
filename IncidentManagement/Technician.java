
package IncidentManagement;

public class Technician extends User {

    public Technician(int id, String username, String password) {
        super(id, username, password, 2);
    }
    public void viewAssignedIncidents() {
        boolean found = false;
        for (Incident i : incidents) {
            if (i.getAssignedTo().equals(username)) {
                i.display();
                found = true;
            }
        }
        if (!found) {
            System.out.println("No incidents assigned to you.");
        }
    }
    public void investigateIncident() {
        Incident i = getAssignedIncident();

        if (i == null) {
            return;
        }

        System.out.print("Enter investigation notes: ");
        i.addNotes(sc.nextLine());
        i.updateStatus("In Progress");

        System.out.println("Investigation updated.");
    }

    public void updateIncidentStatus() {
        Incident i = getAssignedIncident();

        if (i == null) {
            return;
        }

        System.out.print("Enter status (Open/In Progress): ");
        String status = sc.nextLine();
        status = status.trim();
        if (status.equalsIgnoreCase("Open")) {
            i.updateStatus("Open");
        } else if (status.equalsIgnoreCase("In Progress")) {
            i.updateStatus("In Progress");
        } else {
            System.out.println("Invalid status.");
            return;
        }

        System.out.println("Status updated.");
    }

    public void resolveIncident() {
    Incident i = getAssignedIncident();

    if (i == null) {
        return;
    }

    System.out.print("Enter resolution details: ");
    i.setResolution(sc.nextLine());
    i.updateStatus("Resolved");

    System.out.println("Incident resolved successfully.");
}

    private Incident getAssignedIncident() {
        viewAssignedIncidents();

        System.out.print("Enter incident ID: ");
        int id = Integer.parseInt(sc.nextLine());

        Incident i = findIncident(id);

        if (i == null ||
                !i.getAssignedTo().equals(username)) {
            System.out.println("Incident not assigned to you.");
            return null;
        }

        return i;
    }

    @Override
    public void showMenu() {
        while (true) {
            System.out.println("\n--- TECHNICIAN MENU ---");
            System.out.println("1. View assigned incidents");
            System.out.println("2. Investigate incident");
            System.out.println("3. Update incident status");
            System.out.println("4. Resolve incident");
            System.out.println("5. Logout");
            System.out.print("Choose: ");

            int choice = Integer.parseInt(sc.nextLine());

            switch (choice) {
                case 1 -> viewAssignedIncidents();
                case 2 -> investigateIncident();
                case 3 -> updateIncidentStatus();
                case 4 -> resolveIncident();
                case 5 -> {
                    return;
                }
                default -> System.out.println("Invalid choice.");
            }
        }
    }
}
