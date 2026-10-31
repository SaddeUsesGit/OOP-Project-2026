
package IncidentManagement;

import java.util.ArrayList;
import java.util.Scanner;

public abstract class User {
    protected int id;
    protected String username;
    protected String password;
    protected int role;
    protected static ArrayList<Incident> incidents = new ArrayList<>();
    protected static ArrayList<User> users = new ArrayList<>();
    protected static Scanner sc = new Scanner(System.in);
    public User(int id, String username,String password, int role) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.role = role;
    }
    public int getRole() {
        return role;
    }
    public String getUsername() {
        return username;
    }
    public boolean loginUser() {
        System.out.print("Username: ");
        String name = sc.nextLine();
        System.out.print("Password: ");
        String pass = sc.nextLine();
        return username.equals(name)&& password.equals(pass);
    }
    public static void getAllIncidents() {
        if (incidents.isEmpty()) {
            System.out.println("No incidents found.");
            return;
        }
        for (Incident i : incidents) {
            i.display();
        }
    }
    protected Incident findIncident(int id) {
        for (Incident i : incidents) {
            if (i.getId() == id) {
                return i;
            }
        }
        return null;
    }
    public abstract void showMenu();
}
