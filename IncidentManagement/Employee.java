
package IncidentManagement;

public class Employee extends User {

    public Employee(int id, String username, String password) {
        super(id, username, password, 1);
    }
    public void reportIncident() {
        System.out.print("Enter incident title: ");
        String title = sc.nextLine();
        System.out.print("Enter description: ");
        String description = sc.nextLine();
       incidents.add(new Incident(title, description, username));

// Save incidents to incidents.dat
IncidentFileManager.saveIncidents();

System.out.println("Incident reported successfully.");
    }
    public void viewMyIncidents() {
        boolean found = false;
        for (Incident i : incidents) {
            if (i.getReportedBy().equals(username)) {
                i.display();
                found = true;
            }
        }
        if (!found) {
            System.out.println("No incidents reported by you.");
        }
    }
    public void trackIncident() {
        viewMyIncidents();
    }
    public void provideFeedback() {
        viewMyIncidents();
        System.out.print("Enter incident ID: ");
        int id = Integer.parseInt(sc.nextLine());
        Incident i = findIncident(id);
        if (i == null ||!i.getReportedBy().equals(username)) {
            System.out.println("Incident not found.");
            return;
        }
        if (!i.getStatus().equals("Resolved")) {
            System.out.println("Incident is not resolved yet.");
            return;
        }
        System.out.print("Enter feedback: ");
        i.setFeedback(sc.nextLine());
        System.out.println("Feedback submitted.");
    }
    @Override
    public void showMenu() {
        while (true) {
            System.out.println("\n--- EMPLOYEE MENU ---");
            System.out.println("1. Report incident");
            System.out.println("2. View my incidents");
            System.out.println("3. Track incident status");
            System.out.println("4. Provide feedback");
            System.out.println("5. Logout");
            System.out.print("Choose: ");

            int choice = Integer.parseInt(sc.nextLine());
            switch (choice) {
                case 1 -> reportIncident();
                case 2 -> viewMyIncidents(); 
                case 3 -> trackIncident();
                case 4 -> provideFeedback();
                case 5 -> {
                    return;
                }
                default -> System.out.println("Invalid choice.");
            }
        }
    }
}
