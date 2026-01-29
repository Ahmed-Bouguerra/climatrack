import { Component, OnInit } from '@angular/core';
import { ParcelleService } from '../services/parcelle.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parcelles-table',
  templateUrl: './parcelles-table.component.html',
  styleUrls: ['./parcelles-table.component.css']
})
export class ParcellesTableComponent implements OnInit {
  parcelles: any[] = [];

  constructor(
    private parcelleService: ParcelleService,
    private router: Router
  ) {}

  ngOnInit() {
    this.parcelleService.getParcelles().subscribe(res => {
      this.parcelles = res;
    });
  }

  voirDetails(id: number) {
    this.router.navigate(['/parcelles', id]);
  }
}