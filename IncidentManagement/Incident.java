package IncidentManagement;

import java.io.Serializable;

public class Incident implements Serializable {
    private static final long serialVersionUID = 1L;
    private static int nextId = 1;

public static void setNextId(int value) {
    nextId = value;
}

private int id;
    private String title;
    private String description;
    private String status;
    private String reportedBy;
    private String assignedTo;
    private String notes;
    private String resolution;
    private String feedback;
    public Incident(String title, String description,String reportedBy) {
        this.id = nextId++;
        this.title = title;
        this.description = description;
        this.reportedBy = reportedBy;
        this.status = "Open";
        this.assignedTo = "Unassigned";
        this.notes = "None";
        this.resolution = "Pending";
        this.feedback = "Not provided";
    }
    public int getId() {
        return id;
    }
    public String getStatus() {
        return status;
    }
    public String getReportedBy() {
        return reportedBy;
    }
    public String getAssignedTo() {
        return assignedTo;
    }
    public void assignTechnician(String name) {
        assignedTo = name;
        IncidentFileManager.saveIncidents();
    }
    public void updateStatus(String status) {
        this.status = status;
        IncidentFileManager.saveIncidents();
    }
    public void addNotes(String notes) {
        this.notes = notes;
        IncidentFileManager.saveIncidents();
    }
    public void setResolution(String resolution) {
        this.resolution = resolution;
        IncidentFileManager.saveIncidents();
    }
    public void setFeedback(String feedback) {
        this.feedback = feedback;
        IncidentFileManager.saveIncidents();
    }
    public void display() {
        System.out.println("\nIncident ID: " + id);
        System.out.println("Title: " + title);
        System.out.println("Description: " + description);
        System.out.println("Reported by: " + reportedBy);
        System.out.println("Assigned to: " + assignedTo);
        System.out.println("Status: " + status);
        System.out.println("Investigation notes: " + notes);
        System.out.println("Resolution: " + resolution);
        System.out.println("Feedback: " + feedback);
    }
}
