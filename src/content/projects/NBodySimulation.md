---
title: "N-Body Simulation MPI"
description: "C++ program using MPI for nbody simulation"
pubDate: "Jan 11 2024"
updatedDate: "April 2 2024"
heroImage: "/projects/nbody/nbody-hero.png"
heroGif: "/projects/nbody/nbody-gif.gif"
---

## N-Body Simulation

### Introduction

In this project, we explore the problem of N-bodies, a classic subject in physics involving the calculation of movements of bodies influenced by gravity. Our goal is to create a 2D simulation using a distributed system to optimize computations. References to positions/accelerations in a third dimension may occur throughout this report due to a perspective of expanding the initial subject which we couldn’t complete due to time constraints.

### Subject Analysis

This project aims to develop an N-body simulation using parallel programming with MPI (Message Passing Interface) in C++. This approach is chosen to efficiently handle the intensive computations required by the N-body problem (complexity O(nˆ2)), where the position and velocity of each celestial body are calculated based on the gravity exerted by all other bodies.

### Data Structures and Algorithms

The code uses a `Body` structure to represent each body with its properties (mass, position, velocity). The use of C++ allows storing the data in an `std::vector`.

The main function, `calculateForces`, calculates gravitational forces exerted between a subset of bodies and all other bodies in the general set. Each node calling this function thus performs calculations only on its subset of bodies. Communication between processes is managed by MPI, allowing a synchronized update of the positions and velocities of all bodies after each calculation step.

### Chosen Paradigm

The parallel programming MPI paradigm is chosen for this project. It is justified by the inherently parallel nature of the N-body problem, where calculations for each body can be performed independently of the others.

Here, the use of a paradigm like Map-Reduce would make no sense because the volume of data used in communication is relatively low, the constraint being primarily on the calculation of forces exerted on each pair of particles.

The project thus requiring a high computational capacity, the choice of a low-level language like C++ (compared to Java) is appropriate. Moreover, each node operates only on its subset of data, excluding any paradigm proposing concurrency management.

The use of MPI allows exploiting this parallelization by distributing calculations across multiple nodes to effectively process large-scale computations.

### Decomposition into Sub-Problems

The problem is decomposed into several sub-problems:

-   Initialization of bodies
-   Calculation of forces/accelerations exerted on each body
-   Updating positions

### Body Initialization Code

The `initBodies` function is used to initialize a vector of `Body` structures. Each `Body` represents an object in space, with its mass, position, and velocity properties. In this project, we have chosen to simulate a massive body at the center of a system of lighter mass bodies. This system of bodies is generated at random positions in a ring around the massive body. For experimental purposes, it is possible to modify the acceleration parameters of the massive body and/or the lighter mass bodies (vx, vy, and vz parameters of the bodies).

```cpp
void initBodies(std::vector<Body>& bodies) {
    if (!bodies.empty()) {
        bodies[0].mass = 100000.0;
        bodies[0].x = 0;
        bodies[0].y = 0;
        bodies[0].z = 0;
        bodies[0].vx = 0;
        bodies[0].vy = 0;
        bodies[0].vz = 0;
    }

    int externalDiameter = 80000;
    int internalDiameter = 40000;

    for (size_t i = 1; i < bodies.size(); ++i) {
        double r = (internalDiameter + (rand()
        % (externalDiameter - internalDiameter)));

        double theta = (rand() % 360) * (M_PI / 180);
        double x = r * cos(theta);
        double y = r * sin(theta);

        bodies[i].mass = 1.0;
        bodies[i].x = x;
        bodies[i].y = y;
        bodies[i].z = 0;
        bodies[i].vx = 10;
        bodies[i].vy = -10;
        bodies[i].vz = 0;
    }
}
```

_Function Initializing the Simulated Stellar System_

Body Structure:

```cpp
struct Body {
    double mass;
    double x, y, z; // Coordinates
    double vx, vy, vz; // Velocities

    Body() : mass(0), x(0), y(0), z(0), vx(0), vy(0), vz(0) {}
    Body(double m, double _x, double _y, double _z,
    double _vx, double _vy, double _vz)
        : mass(m), x(_x), y(_y), z(_z), vx(_vx), vy(_vy), vz(_vz) {}

};
```

#### calculateForces Method

The `calculateForces` method calculates the forces acting on a subset of objects (based on the rank) relative to the overall set in the `Body` structure vector.

This method is based on Newton's formula:

$$
F = G * (m1 * m2) / (d^2)
$$

The function takes a vector of `Body`, the rank (`rank`) of the current node, and the total number of nodes (`numProcesses`) as input. It begins by determining the subset each node should process. This is done by dividing the total number of bodies by the number of nodes, thus assigning each a range of bodies to work on. This approach allows for a balanced distribution of work and optimizes the use of computational resources.

For each body assigned to a node, the method calculates the force resulting from the interaction with all other bodies. To avoid calculating the force exerted on a body by itself, a condition (`if (i != j)`) is used. The force is calculated using the formula for universal gravitation, where `dx` and `dy` represent the difference in position between two bodies. A small value `epsilon` is added to the denominator to prevent division by zero in cases of extreme proximity between two bodies.

After calculating the force, the velocity of each body is updated accordingly. This update takes into account the mass of each body and uses the mass multiplier to adjust the impact of the force on the velocity. Updating the velocity is essential for simulating the movement of bodies in response to the forces they experience.

We add a value (`epsilon`) to our force calculation to limit outliers when two particles come very close. This limits the effects of forces that tend towards infinity due to a division close to 0.

```cpp
void calculateForces(
    std::vector<Body>& bodies,
    int rank,
    int numProcesses
) {
    const long massMultiplier = 1e12;
    int numBodies = bodies.size();
    int bodiesPerProcess = numBodies / numProcesses;
    int startIdx = rank * bodiesPerProcess;
    int endIdx = startIdx + bodiesPerProcess;

    for (int i = startIdx; i < endIdx; ++i) {
        for (int j = 0; j < numBodies; ++j) {
            if (i != j) {
                double dx = bodies[j].x - bodies[i].x;
                double dy = bodies[j].y - bodies[i].y;
                double dist = sqrt(dx * dx + dy * dy);
                double epsilon = 1e-10;
                double force = (
                    G * bodies[i].mass * massMultiplier
                    * bodies[j].mass * massMultiplier
                ) / (dist * dist * dist + epsilon);
                double fx = force * dx;
                double fy = force * dy;
                bodies[i].vx += fx / (bodies[i].mass * massMultiplier);
                bodies[i].vy += fy / (bodies[i].mass * massMultiplier);
            }
        }
    }
}
```

Force Calculation Function

#### updatePositions Method

For each node, `updatePositions` updates the position based on the current velocity and the time interval `dt` for each of the bodies in its subset. The new positions are calculated by adding the product of the velocity in each direction (x, y) and the elapsed time `dt` to the current position.

```cpp
void updatePositions(
    std::vector<Body>& bodies,
    double dt,
    int rank,
    int numProcesses
) {
    int numBodies = bodies.size();
    int bodiesPerProcess = numBodies / numProcesses;
    int startIdx = rank * bodiesPerProcess;
    int endIdx = startIdx + bodiesPerProcess;

    for (int i = startIdx; i < endIdx; ++i) {
        bodies[i].x += bodies[i].vx * dt;
        bodies[i].y += bodies[i].vy * dt;
        //bodies[i].z += bodies[i].vz * dt;
    }
}
```

Body Position Update

#### MPI Initialization

The simulation starts with the initialization of the MPI environment, which is essential for parallel operation:

-   `MPI_Init(&argc, &argv);` initializes MPI and allows each process to use MPI functions.
-   `MPI_Comm_rank` and `MPI_Comm_size` determine the rank and total number of processes in the communicator.
-   `MPI_Get_processor_name` retrieves the host name for each process.
-   `MPI_Comm_set_errhandler` sets the error handler for the communicator.

#### Simulation Setup

The simulation parameters such as the time interval (`dt`), the total number of bodies (`total_bodies`), and the number of steps (`num_steps`) are defined. These parameters can be adjusted via command line arguments.

#### Initialization and Broadcast of Bodies

Bodies are initialized in a `bodies` vector, and then the initial data are broadcast to all nodes via `MPI_Bcast`.

#### Simulation Loop

The simulation is orchestrated within a `for` loop, where each iteration represents a step in the simulation. During these steps, specific MPI functions are used to ensure effective synchronization and communication between the different nodes. Here are the key MPI functions used in this loop:

-   `MPI_Bcast`: This function is used to broadcast body data from the main node (rank 0) to all other nodes. It ensures that each process starts each simulation step with the most recent data.
-   `MPI_Allgather`: After updating the positions and velocities of the bodies by each node, `MPI_Allgather` collects the updated data from all subsets of bodies processed by each node and distributes them to all nodes. This function is crucial to ensure that each node has a complete and updated set of data on all bodies for the next simulation step.
-   MPI Error Handling: Functions such as `MPI_Comm_set_errhandler` are used to define custom error handlers, allowing for better management of exceptions and error situations that may occur during parallel communication.

#### Output Data Management

The process of rank 0 manages an output buffer and a writing thread to record the results in a file. This approach minimizes writing operations and optimizes performance.

#### Synchronization and Communication

Functions such as `MPI_Allgather` are used to synchronize updated data among all nodes, ensuring that each process has the necessary information for the next simulation step.

#### Finalization

At the end of the simulation, all MPI resources are cleaned up, and the MPI environment is finalized with the call to `MPI_Finalize`.

This breakdown allows the problem to be processed step by step, ensuring that each part is optimized and functions correctly in a parallel environment.

#### Conclusion of the Analysis

The choice of C++ with MPI for this project is dictated by the need to manage large amounts of computations efficiently. The code structure, algorithmic choices, and parallel programming paradigm are all oriented towards achieving this goal, ensuring an accurate and efficient simulation of the N-body problem.

Here is a [video of the program visualizing the results](https://youtube.com/shorts/L-RjCFGIovc).

#### Hosts Script

The script presented below aims to facilitate the identification and management of available hosts in a computer network. The main goal is to determine the number of processors available on each host, using an automated scripting approach. This script is written in Python and uses several modules, including `sys`, `subprocess`, `threading`, and `os`.

The core of the script lies in the `handle_host` function, which attempts to connect to each specified host and retrieve the number of available threads. This function uses `ssh` for remote connections and `nproc` to obtain the thread count. The results are accumulated and recorded in a file, and the totals are calculated to give an overview of the network's processing capacity.

A threading mechanism is used to handle multiple hosts simultaneously, thereby enhancing the efficiency of the script. Finally, the script calculates and displays the average number of CPUs per computer, as well as the total number of available processors, providing a concise view of the network's resources.

In its initial version, the script did not include a multithreading mechanism, which limited its efficiency. The current version incorporates a threading mechanism to handle multiple hosts simultaneously, significantly improving the efficiency of the script. This improvement optimizes the processing and analysis time by parallelizing the tasks of connection and information retrieval. Finally, the script calculates and displays the average number of CPUs per computer, as well as the total number of available processors, providing a concise view of the network's resources.

#### Reduction of Calculation Time by Exploiting Symmetry in the Gravitational Formula

One potential improvement for reducing calculation time would have been to exploit a symmetry identified in the force calculations (the force between body A and B is the symmetry of the force between body B and A). This symmetry could have been exploited by an implementation in a ring. This solution was not chosen due to time constraints.

#### Fault Tolerance

With the C++ implementation of OpenMPI, we had the possibility to define error management with the function `MPI_Comm_set_errhandler` on the parameter allowing to send an `MPI::Exception` when an error is detected. This option would have allowed the identification of a non-responding node, remove this node from the list, and restart the previous calculation step. This solution was not chosen due to time constraints.
