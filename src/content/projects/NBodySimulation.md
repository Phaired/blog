---
title: 'N-Body Simulation MPI'
description: "C++ program using MPI for nbody simulation"
pubDate: 'Jan 11 2024'
heroImage: '/nbody/nbody-hero.png'
---
## N-Body Simulation

### Introduction

Dans ce projet, nous explorons le problème des N-corps, un sujet classique en physique qui implique de calculer les
mouvements de corps influencés par la gravitation. Notre but est de créer une simulation en 2D utilisant un système
distribué pour optimiser les calculs. Plusieurs fois au cours de ce compte-rendu des positions/accélérations selon une
troisième dimension peuvent-être référencées, ceci est dû à une perspective de développement du sujet initial que nous
n'avons pas pu mener à terme en raison d'un manque de temps.

### Analyse du sujet

Ce projet vise à développer une simulation de N-corps en utilisant la programmation parallèle avec MPI (Message Passing
Interface) en C++. Cette approche est choisie pour gérer efficacement les calculs intensifs requis par le problème des
N-corps (complexité O(nˆ2)), où la position et la vitesse de chaque corps céleste sont calculées en
fonction de la gravité exercée par tous les autres corps.

### Structures de Données et Algorithmes

Le code utilise une structure `Body` pour représenter chaque corps avec ses propriétés (masse, position,
vitesse). L'utilisation de C++ permet de stocker les données dans un `std::vector`.

La fonction principale, `calculateForces`, calcule les forces gravitationnelles exercées entre un sous-ensemble
de corps et tous les autres corps de l'ensemble général. Chaque noeud appelant cette fonction exécutera ainsi les
calculs uniquement sur son sous-ensemble de corps. La communication entre les processus est gérée par MPI, permettant
une mise à jour synchronisée des positions et des vitesses de tous les corps après chaque étape de calcul.

### Paradigme Retenu

Le paradigme de programmation parallèle MPI est retenu pour ce projet. Il est justifié par la nature intrinsèquement
parallèle du problème des N-corps, où les calculs pour chaque corps peuvent être effectués indépendamment des autres.

Ici, l'utilisation d'un paradigme comme Map-Reduce ne ferait aucun sens car le volume de données utilisé dans la
communication est relativement faible, la contrainte étant surtout sur le calcul des forces exercées sur chaque couple
de particule.

Le projet nécessitant donc une grande capacité de calcul, le choix d'un langage bas niveau comme C++ (en comparaison à
Java) est donc de rigueur. De plus, chaque noeud opèrera uniquement sur son sous-ensemble de données excluant de fait
tout paradigme proposant une gestion de la concurrence.

L'utilisation de MPI permet d'exploiter cette parallélisation en répartissant les calculs sur plusieurs nœuds pour
traiter efficacement des calculs de grande envergure.

### Décomposition en Sous-Problèmes

Le problème est décomposé en plusieurs sous-problèmes :

- Initialisation des corps
- Calcul des forces/accélérations exercées sur chaque corps
- Mise à jour des positions

### Code d'initialisation des Corps

La fonction `initBodies` est utilisée pour initialiser un vecteur de structures `Body`. Chaque
`Body` représente un objet dans l'espace, avec ses propriétés de masse, position et vitesse. Dans ce projet nous
avons fais le choix de simuler un corps massif au centre d'un système de corps de masses plus faibles. Ce système de
corps est généré à des positions aléatoires en anneau autour du corps massif. À des fins d'expérimentation, il est
possible de modifier les paramètres d'accélération du corps massif et/ou des corps de plus petite masse (paramètres vx,
vy et vz des corps).

```C++
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

*Fonction initialisant le système stellaire simulé*

Structure Body :

```C++
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

#### Méthode calculateForces

La méthode `calculateForces` calcule les forces agissant sur un sous-ensemble d'objets (en fonction du rank) par
rapport à l'ensemble global dans le vecteur de structures `Body`.

Cette méthode se base sur la formule de Newton :

`
F=G*(m1*m2)/(d^2)
`

La fonction prend en entrée un vecteur de `Body`, le rang (`rank`) du noeud actuel et le nombre total de
noeuds (`numProcesses`). Elle commence par déterminer le sous-ensemble que chaque noeuds doit traiter. Ceci est
réalisé en divisant le nombre total de corps par le nombre de noeuds, assignant ainsi à chacun une plage de corps sur
laquelle travailler. Cette approche permet une répartition équilibrée du travail et optimise l'utilisation des
ressources de calcul.

Pour chaque corps attribué à un noeud, la méthode calcule la force résultant de l'interaction avec tous les autre corps.
Pour éviter le calcul de la force exercée sur un corps par lui-même, une condition (`if (i != j)`) est utilisée.
La force est calculée en utilisant la formule de la gravitation universelle, où `dx` et `dy` représentent
la différence de position entre deux corps. Une petite valeur `epsilon` est ajoutée au dénominateur pour éviter
la division par zéro en cas de proximité extrême entre deux corps.

Après le calcul de la force, la vitesse de chaque corps est mise à jour en conséquence. Cette mise à jour prend en
compte la masse de chaque corps et utilise le multiplicateur de masse pour ajuster l'impact de la force sur la vitesse.
La mise à jour de la vitesse est essentielle pour simuler le mouvement des corps en réponse aux forces qu'ils
subissent.

Nous ajoutons une valeur (`epsilon`) à notre calcul de force pour limiter les valeurs aberrantes lorsque deux particules
se retrouvent très proches. Cela limite les effets de force qui tendent vers l'infini à cause d'une division proche de
0 .

```C++
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

Fonction de calcul des forces

#### Méthode updatePositions

Pour chaque nœud, `updatePositions` met à jour la position en fonction de la vitesse actuelle et de l'intervalle de
temps `dt` de chacun des corps de son sous-ensemble. Les nouvelles positions sont calculées en ajoutant le produit de la
vitesse dans chaque direction (x, y) et du temps écoulé `dt` à la position actuelle.

```C++
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

Mise à jour de la position des corps

#### Initialisation de MPI

La simulation commence par l'initialisation de l'environnement MPI, qui est essentielle pour le fonctionnement
parallèle :

- `MPI_Init(&argc, &argv);` initialise MPI et permet à chaque processus d'utiliser les fonctions MPI.
- `MPI_Comm_rank` et `MPI_Comm_size` déterminent le rang et le nombre total de processus dans le communicateur.
- `MPI_Get_processor_name` récupère le nom de l'hôte pour chaque processus.
- `MPI_Comm_set_errhandler` définit le gestionnaire d'erreurs pour le communicateur.

#### Configuration de la Simulation

Les paramètres de la simulation tels que l'intervalle de temps (`dt`), le nombre total de corps (`total_bodies`), et le
nombre d'étapes (`num_steps`) sont définis. Ces paramètres peuvent être ajustés via les arguments de ligne de commande.

#### Initialisation et Broadcast des Corps

Les corps sont initialisés dans un vecteur `bodies`, puis les données initiales sont diffusées à tous les nœuds
via `MPI_Bcast`.

#### Boucle de Simulation

La simulation est orchestrée au sein d'une boucle `for`, où chaque itération représente une étape de la simulation. Au
cours de ces étapes, des fonctions MPI spécifiques sont utilisées pour assurer la synchronisation et la communication
efficaces entre les différents noeuds. Voici les fonctions MPI clés utilisées dans cette boucle :

- `MPI_Bcast` : Cette fonction est utilisée pour diffuser les données des corps depuis le noeud principal (rang 0) vers
  tous les autres noeuds. Elle garantit que chaque processus commence chaque étape de la simulation avec les données les
  plus récentes.
- `MPI_Allgather` : Après la mise à jour des positions et des vitesses des corps par chaque noeud, `MPI_Allgather`
  collecte les données mises à jour de tous les sous-ensembles de corps traités par chaque noeud et les distribue à tous
  les noeuds. Cette fonction est cruciale pour assurer que chaque noeud dispose d'un ensemble complet et à jour de
  données sur tous les corps pour la prochaine étape de simulation.
- Gestion des Erreurs MPI : Des fonctions telles que `MPI_Comm_set_errhandler` sont utilisées pour définir des
  gestionnaires d'erreurs personnalisés, permettant une meilleure gestion des exceptions et des situations d'erreur qui
  peuvent survenir pendant la communication parallèle.

#### Gestion des Données de Sortie

Le processus de rang 0 gère un tampon de sortie et un thread d'écriture pour enregistrer les résultats dans un fichier.
Cette approche minimise les opérations d'écriture et optimise les performances.

#### Synchronisation et Communication

Des fonctions telles que `MPI_Allgather` sont utilisées pour synchroniser les données mises à jour entre tous
les nœuds, assurant que chaque processus dispose des informations nécessaires pour la prochaine étape de la simulation.

#### Finalisation

À la fin de la simulation, toutes les ressources MPI sont nettoyées et l'environnement MPI est finalisé avec l'appel de
`MPI_Finalize`.

Cette décomposition permet de traiter le problème étape par étape, en s'assurant que chaque partie est optimisée et
fonctionne correctement dans un environnement parallèle.

#### Conclusion de l'Analyse

Le choix de C++ avec MPI pour ce projet est dicté par la nécessité de gérer de grandes quantités de calculs de manière
efficace. La structure du code, les choix algorithmiques et le paradigme de programmation parallèle sont tous orientés
vers l'atteinte de cet objectif, en garantissant une simulation précise et performante du problème des N-corps.

Ci joint une [vidéo du programme de visualisation des résultats](https://youtube.com/shorts/L-RjCFGIovc)

#### Script d'Hosts

Le script présenté ci-dessous vise à faciliter l'identification et la gestion des hôtes (hosts) disponibles dans un
réseau informatique. L'objectif principal est de déterminer le nombre de processeurs disponibles sur chaque hôte, en
utilisant une approche de script automatisé. Ce script est écrit en Python et utilise plusieurs modules,
notamment `sys`, `subprocess`, `threading`, et `os`.

Le cœur du script réside dans la fonction `handle_host`, qui tente de se connecter à chaque hôte spécifié et de
récupérer le nombre de threads disponibles. Cette fonction utilise `ssh` pour les connexions à distance et `nproc` pour
obtenir le compte de threads. Les résultats sont accumulés et enregistrés dans un fichier, et les totaux sont calculés
pour donner une vue d'ensemble de la capacité de traitement du réseau.

Un mécanisme de threading est utilisé pour traiter plusieurs hôtes simultanément, améliorant ainsi l'efficacité du
script. Enfin, le script calcule et affiche le nombre moyen de CPU par ordinateur, ainsi que le total des processeurs
disponibles, offrant une vue concise des ressources du réseau.

Dans sa version initiale, le script ne comprenait pas de mécanisme de multithreading, ce qui limitait son efficacité. La
version actuelle intègre un mécanisme de threading pour traiter plusieurs hôtes simultanément, améliorant
significativement l'efficacité du script. Cette amélioration permet d'optimiser le temps de traitement et d'analyse, en
parallélisant les tâches de connexion et de récupération d'informations. Enfin, le script calcule et affiche le nombre
moyen de CPU par ordinateur, ainsi que le total des processeurs disponibles, offrant une vue concise des ressources du
réseau.

#### Réduction du temps de calcul par exploitation de la symétrie dans la formule de la gravitation

Une possibilité d'amélioration du temps de calcul aurait été d'exploiter une symétrie mise en évidence lors du calcul
des forces (la force entre un corps A et B est la symétrie de la force entre le corps B et A). Cette symétrie aurait pu
être exploitée par une implémentation en anneau. Cette solution n'a pas été retenue par manque de temps.

#### Tolérance aux pannes

Grâce à l'implémentation C++ de OpenMPI, nous avions la possibilité de définir la gestion des erreurs avec la
fonction `MPI_Comm_set_errhandler` sur le paramètre permettant d'envoyer une exception `MPI::Exception` quand une erreur
est détectée. Cette option aurait permis d'identifier un noeud ne répondant plus, retirer ce noeud de la liste et
relancer l'étape précédente de calcul. Cette solution n'a pas été retenue par manque de temps.