
package IncidentManagement;
public class Main {
    public static void main(String[] args) {
        IncidentFileManager.loadIncidents();

        // Create default accounts
        User.users.add( new Administrator(1, "admin", "admin123") );
        User.users.add( new Technician(2, "tech", "tech123") );

        User.users.add( new Employee(3, "employee", "emp123"));
        System.out.println("==============================");
        System.out.println(" IT INCIDENT MANAGEMENT SYSTEM");
        System.out.println("==============================");
        while (true) {
            System.out.println("\n1. Login");
            System.out.println("2. Exit");
            System.out.print("Choose: ");
            String choice = User.sc.nextLine();
            if (choice.equals("2")) {
                System.out.println("Thank you!");
                break;
            }
            if (!choice.equals("1")) {
                System.out.println("Invalid choice.");
                continue;
            }
            System.out.print("Enter username: ");
            String username = User.sc.nextLine();
            System.out.print("Enter password: ");
            String password = User.sc.nextLine();
            User currentUser = null;
            for (User u : User.users) {
                if (u.username.equals(username) &&
                        u.password.equals(password)) {
                    currentUser = u;
                    break;
                }
            }
            if (currentUser == null) {
                System.out.println("Invalid credentials.");
                continue;
            }
            System.out.println(
                "Welcome, " + currentUser.getUsername()
            );
            currentUser.showMenu();
        }
        User.sc.close();
    }
}
