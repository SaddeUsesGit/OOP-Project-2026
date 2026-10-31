package IncidentManagement;
public class Administrator extends User {
    public Administrator(int id, String username, String password) {
        super(id, username, password, 3);
    }
    public void manageUsers() {
        System.out.println("\n--- REGISTERED USERS ---");
        for (User u : users) {
            System.out.println(u.id + " | " + u.username +" | Role: " + u.getRole());
        }
        System.out.println("1. Add employee");
        System.out.println("2. Add technician");
        System.out.print("Choose: ");

        int choice = Integer.parseInt(sc.nextLine());

        if (choice != 1 && choice != 2) {
            System.out.println("Invalid choice.");
            return;
        }

        System.out.print("Enter user ID: ");
        int id = Integer.parseInt(sc.nextLine());

        for (User u : users) {
            if (u.id == id || u.username.equals("")) {
                if (u.id == id) {
                    System.out.println("User ID already exists.");
                    return;
                }
            }
        }

        System.out.print("Enter username: ");
        String name = sc.nextLine().trim();

        for (User u : users) {
            if (u.username.equals(name)) {
                System.out.println("Username already exists.");
                return;
            }
        }
        System.out.print("Enter password: ");
        String pass = sc.nextLine();
        if (choice == 1) {
            users.add(new Employee(id, name, pass));
            System.out.println("Employee added.");
        } else { 
            users.add(new Technician(id, name, pass));
            System.out.println("Technician added.");
        }
    }
    public void assignIncident() {
        getAllIncidents();

        System.out.print("Enter incident ID: ");
        int id = Integer.parseInt(sc.nextLine());
        Incident incident = findIncident(id);
        if (incident == null) {
            System.out.println("Incident not found.");
            return;
        }
        System.out.println("Available technicians:");
        for (User u : users) {
            if (u.getRole() == 2) {
                System.out.println(u.getUsername());
            }
        }
        System.out.print("Enter technician username: ");
        String name = sc.nextLine();
        for (User u : users) {
            if (u.getRole() == 2 && u.getUsername().equals(name)) {
                incident.assignTechnician(name);
                System.out.println("Incident assigned.");
                return;
            }
        }
        System.out.println("Technician not found.");
    }
    public void viewReports() {
        int resolved = 0;
        int unresolved = 0;
        for (Incident i : incidents) {
            if (i.getStatus().equals("Resolved")) {
                resolved++;
            } else {
                unresolved++;
            }
        }
        System.out.println("\n--- INCIDENT REPORT ---");
        System.out.println("Total incidents: " + incidents.size());
        System.out.println("Resolved incidents: " + resolved);
        System.out.println("Unresolved incidents: " + unresolved);
        getAllIncidents();
    }
    @Override
    public void showMenu() {
        while (true) {
            System.out.println("\n--- ADMINISTRATOR MENU ---");
            System.out.println("1. Manage users");
            System.out.println("2. View all incidents");
            System.out.println("3. Assign incident");
            System.out.println("4. View reports");
            System.out.println("5. Logout");
            System.out.print("Choose: ");
            int choice = Integer.parseInt(sc.nextLine());
            switch (choice) {
                case 1 -> manageUsers();
                case 2 -> getAllIncidents();
                case 3 -> assignIncident();
                case 4 -> viewReports();
                case 5 -> {
                    return;
                }
                default -> System.out.println("Invalid choice.");
            }
        }
    }
}
