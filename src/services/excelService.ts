
import * as XLSX from 'xlsx';
import { TaskItem } from './geminiService';

export function exportTasksToExcel(tasks: TaskItem[]) {
  // Prepare data for Excel
  const data = tasks.map(({ task, owner, ownerEmail, priority, deadline, files }) => ({
    "Task Description": task,
    "Responsible Owner": owner,
    "Owner Contact": ownerEmail,
    "Priority Rating": priority,
    "Deadline/Timeline": deadline,
    "File References": files,
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths for better readability
  const wscols = [
    { wch: 40 }, // Task
    { wch: 20 }, // Owner
    { wch: 25 }, // Email
    { wch: 15 }, // Priority
    { wch: 20 }, // Deadline
    { wch: 25 }, // Files
  ];
  worksheet['!cols'] = wscols;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Meeting Task Registry");

  // Generate file and trigger download
  const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `OfficeSync_Task_Report_${dateStr}_${timestamp}.xlsx`);
}
