const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

const dbmsQuestions = [
  { questionText: "What does ACID stand for in database transactions?", options: ["Atomicity, Consistency, Isolation, Durability", "Atomicity, Concurrency, Integrity, Durability", "Access, Consistency, Isolation, Data", "Atomicity, Consistency, Integration, Durability"], correctOption: 0, subject: "DBMS", difficulty: "Easy", explanation: "ACID ensures reliable database transactions." },
  { questionText: "Which normal form eliminates partial dependencies?", options: ["1NF", "2NF", "3NF", "BCNF"], correctOption: 1, subject: "DBMS", difficulty: "Medium", explanation: "2NF removes partial dependencies on composite keys." },
  { questionText: "What is a primary key?", options: ["A key that can be NULL", "A unique identifier for each record", "A foreign key reference", "An index key"], correctOption: 1, subject: "DBMS", difficulty: "Easy" },
  { questionText: "Which SQL command is used to remove all rows from a table without logging?", options: ["DELETE", "DROP", "TRUNCATE", "REMOVE"], correctOption: 2, subject: "DBMS", difficulty: "Medium" },
  { questionText: "What is a deadlock in DBMS?", options: ["When a query takes too long", "When two transactions wait for each other indefinitely", "When the database crashes", "When a table is locked permanently"], correctOption: 1, subject: "DBMS", difficulty: "Hard" },
  { questionText: "Which join returns all records from the left table and matched records from the right?", options: ["INNER JOIN", "RIGHT JOIN", "LEFT JOIN", "FULL JOIN"], correctOption: 2, subject: "DBMS", difficulty: "Easy" },
  { questionText: "What is the purpose of an index in a database?", options: ["To store backup data", "To speed up data retrieval", "To enforce constraints", "To normalize tables"], correctOption: 1, subject: "DBMS", difficulty: "Medium" },
  { questionText: "Which of the following is NOT a DDL command?", options: ["CREATE", "ALTER", "SELECT", "DROP"], correctOption: 2, subject: "DBMS", difficulty: "Easy" },
  { questionText: "What is denormalization?", options: ["Converting to higher normal form", "Adding redundancy to improve performance", "Removing duplicate data", "Splitting tables"], correctOption: 1, subject: "DBMS", difficulty: "Medium" },
  { questionText: "In ER model, what represents a relationship between entities?", options: ["Rectangle", "Ellipse", "Diamond", "Triangle"], correctOption: 2, subject: "DBMS", difficulty: "Easy" },
  { questionText: "What is a foreign key?", options: ["A key from another country", "A key referencing the primary key of another table", "A secondary index", "An alternate key"], correctOption: 1, subject: "DBMS", difficulty: "Easy" },
  { questionText: "Which isolation level prevents dirty reads but allows non-repeatable reads?", options: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"], correctOption: 1, subject: "DBMS", difficulty: "Hard" },
  { questionText: "What does SQL stand for?", options: ["Structured Query Language", "Simple Query Language", "Standard Query Logic", "Sequential Query Language"], correctOption: 0, subject: "DBMS", difficulty: "Easy" },
  { questionText: "Which command is used to grant privileges in SQL?", options: ["ALLOW", "PERMIT", "GRANT", "GIVE"], correctOption: 2, subject: "DBMS", difficulty: "Medium" },
  { questionText: "What is a view in SQL?", options: ["A physical table", "A virtual table based on a query", "A stored procedure", "An index"], correctOption: 1, subject: "DBMS", difficulty: "Medium" },
  { questionText: "Which type of database model uses tables to represent data?", options: ["Hierarchical", "Network", "Relational", "Object-oriented"], correctOption: 2, subject: "DBMS", difficulty: "Easy" },
  { questionText: "What is a transaction log?", options: ["A record of all database transactions", "A log of users logged in", "A backup file", "An error report"], correctOption: 0, subject: "DBMS", difficulty: "Medium" },
  { questionText: "What does the GROUP BY clause do in SQL?", options: ["Sorts results", "Groups rows with same values", "Filters rows", "Joins tables"], correctOption: 1, subject: "DBMS", difficulty: "Easy" },
  { questionText: "Which aggregate function returns the number of rows?", options: ["SUM()", "AVG()", "COUNT()", "MAX()"], correctOption: 2, subject: "DBMS", difficulty: "Easy" },
  { questionText: "What is a stored procedure?", options: ["A table with stored data", "A precompiled set of SQL statements", "A database backup", "A type of index"], correctOption: 1, subject: "DBMS", difficulty: "Medium" },
  { questionText: "What is the difference between WHERE and HAVING?", options: ["No difference", "WHERE filters rows, HAVING filters groups", "HAVING filters rows, WHERE filters groups", "Both filter groups"], correctOption: 1, subject: "DBMS", difficulty: "Medium" },
  { questionText: "What is a candidate key?", options: ["A key that is always NULL", "A minimal set of attributes that uniquely identifies a tuple", "A key with maximum attributes", "A foreign key"], correctOption: 1, subject: "DBMS", difficulty: "Hard" },
  { questionText: "Which type of relationship allows one record to relate to many?", options: ["One-to-One", "Many-to-Many", "One-to-Many", "None of the above"], correctOption: 2, subject: "DBMS", difficulty: "Easy" },
  { questionText: "What is the HAVING clause used for?", options: ["Filtering individual rows", "Filtering aggregated groups", "Sorting results", "Joining tables"], correctOption: 1, subject: "DBMS", difficulty: "Medium" },
  { questionText: "Which command is used to undo a transaction?", options: ["UNDO", "ROLLBACK", "REVERT", "CANCEL"], correctOption: 1, subject: "DBMS", difficulty: "Easy" },
];

const osQuestions = [
  { questionText: "What is a process in an operating system?", options: ["A program stored on disk", "A program in execution", "A set of instructions", "A file in memory"], correctOption: 1, subject: "Operating Systems", difficulty: "Easy", explanation: "A process is a program that is currently being executed." },
  { questionText: "Which scheduling algorithm gives the minimum average waiting time?", options: ["FCFS", "Round Robin", "SJF", "Priority"], correctOption: 2, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What is a semaphore?", options: ["A network protocol", "A synchronization mechanism", "A memory management technique", "A scheduling algorithm"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What is virtual memory?", options: ["Memory on the GPU", "Using disk space as extra RAM", "RAM installed on motherboard", "Cache memory"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "Which page replacement algorithm suffers from Belady's anomaly?", options: ["LRU", "FIFO", "Optimal", "LFU"], correctOption: 1, subject: "Operating Systems", difficulty: "Hard" },
  { questionText: "What is a critical section?", options: ["A hardware component", "Part of code that accesses shared resources", "An OS kernel function", "A memory segment"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What does CPU stand for?", options: ["Central Processing Unit", "Core Processing Unit", "Central Program Utility", "Computer Processing Unit"], correctOption: 0, subject: "Operating Systems", difficulty: "Easy" },
  { questionText: "What is thrashing in OS?", options: ["When CPU is idle", "When system spends more time swapping than executing", "When RAM is full", "When a process terminates abruptly"], correctOption: 1, subject: "Operating Systems", difficulty: "Hard" },
  { questionText: "Which of the following is NOT a process state?", options: ["Ready", "Running", "Sleeping", "Blocked"], correctOption: 2, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What is a kernel?", options: ["The core of the OS managing hardware resources", "A type of processor", "A memory chip", "An application program"], correctOption: 0, subject: "Operating Systems", difficulty: "Easy" },
  { questionText: "What is a thread?", options: ["A lightweight process sharing memory", "A heavy process", "A file system component", "A network connection"], correctOption: 0, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "Which algorithm is used for deadlock avoidance?", options: ["Round Robin", "Banker's Algorithm", "Peterson's Solution", "Dining Philosophers"], correctOption: 1, subject: "Operating Systems", difficulty: "Hard" },
  { questionText: "What is paging in OS?", options: ["Dividing disk into pages", "Dividing memory into fixed-size pages", "A disk scheduling technique", "A file allocation method"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What is a context switch?", options: ["Changing user passwords", "Saving and restoring process state when CPU switches processes", "Changing OS settings", "Switching between RAM and disk"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "Which memory allocation strategy leads to external fragmentation?", options: ["Paging", "Segmentation", "Both", "Neither"], correctOption: 1, subject: "Operating Systems", difficulty: "Hard" },
  { questionText: "What is the purpose of the Translation Lookaside Buffer (TLB)?", options: ["To store page tables", "To speed up virtual-to-physical address translation", "To manage processes", "To handle interrupts"], correctOption: 1, subject: "Operating Systems", difficulty: "Hard" },
  { questionText: "What is mutual exclusion?", options: ["Multiple processes sharing a resource simultaneously", "Only one process accessing a critical section at a time", "Two processes being mutually dependent", "A deadlock condition"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What does FCFS stand for?", options: ["Fast CPU First Scheduling", "First Come First Served", "First Core First System", "Fixed Clock Frequency Scheduling"], correctOption: 1, subject: "Operating Systems", difficulty: "Easy" },
  { questionText: "What is a zombie process?", options: ["A malware process", "A process that has completed but still has an entry in the process table", "A sleeping process", "A process with high priority"], correctOption: 1, subject: "Operating Systems", difficulty: "Hard" },
  { questionText: "What is spooling?", options: ["Sending data directly to printer", "Storing data in a buffer for slow devices", "A CPU scheduling technique", "A disk fragmentation process"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What is the difference between preemptive and non-preemptive scheduling?", options: ["No difference", "Preemptive allows forceful removal of CPU from a process; non-preemptive does not", "Non-preemptive is faster", "Preemptive is used only in real-time systems"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What is an interrupt?", options: ["A software bug", "A signal to the CPU to stop current work and handle an event", "A memory error", "A disk failure"], correctOption: 1, subject: "Operating Systems", difficulty: "Easy" },
  { questionText: "Which is the fastest memory in the memory hierarchy?", options: ["Hard Disk", "RAM", "Cache", "Registers"], correctOption: 3, subject: "Operating Systems", difficulty: "Easy" },
  { questionText: "What is the role of a device driver?", options: ["To power off devices", "To provide an interface between hardware and OS", "To store device data", "To schedule device access"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
  { questionText: "What is the function of the process control block (PCB)?", options: ["Stores user data", "Stores process state, program counter, registers, and other info", "Controls the CPU clock", "Manages disk I/O"], correctOption: 1, subject: "Operating Systems", difficulty: "Medium" },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create admin user
    let admin = await User.findOne({ registrationNo: 'ADMIN001' });
    if (!admin) {
      admin = await User.create({
        registrationNo: 'ADMIN001',
        name: 'Quiz Master Admin',
        email: 'admin@quizmaster.com',
        password: 'Admin@123',
        role: 'admin',
      });
      console.log('✅ Admin user created: ADMIN001 / Admin@123');
    }

    // Create the main quiz
    let quiz = await Quiz.findOne({ title: 'DBMS & OS Final Exam' });
    if (!quiz) {
      quiz = await Quiz.create({
        title: 'DBMS & OS Final Exam',
        description: '50-question comprehensive exam covering DBMS and Operating Systems',
        subject: 'Mixed',
        totalQuestions: 50,
        durationMinutes: 30,
        positiveMarks: 4,
        negativeMarks: 1,
        isActive: true,
        isRandomized: true,
        createdBy: admin._id,
      });
      console.log('✅ Quiz created:', quiz.title);
    }

    // Delete old questions for this quiz to re-seed
    await Question.deleteMany({ quizId: quiz._id });

    // Insert all 50 questions
    const allQuestions = [
      ...dbmsQuestions.map((q) => ({ ...q, quizId: quiz._id })),
      ...osQuestions.map((q) => ({ ...q, quizId: quiz._id })),
    ];

    await Question.insertMany(allQuestions);
    console.log(`✅ ${allQuestions.length} questions seeded`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('📋 Admin Login: ADMIN001 / Admin@123');
    console.log('📋 Student: Register with any registration number');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seedDB();