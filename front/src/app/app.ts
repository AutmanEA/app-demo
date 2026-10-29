import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from "@angular/forms"

interface Message {
  id: number,
  content: string;
  createdAt: string;
}

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private http = inject(HttpClient);
  messages = signal<Message[]>([]);
  content = signal('');

  ngOnInit(): void {
    this.load();
  }

  private gql<T>(query: string, variables?: object) {
    return this.http.post<{ data: T }>('/graphql', { query, variables });
  }

  load() {
    this.gql<{ messages: Message[] }>(`{ messages { id content createdAt } }`)
      .subscribe((res) => this.messages.set(res.data.messages));
  }

  send() {
    const content = this.content().trim();
    if (!content) return;
    this.gql(
      `mutation ($content: String!) { addMessage(content: $content) { id } }`,
      { content },
    ).subscribe(() => {
      this.content.set('');
      this.load();
    })
  }
}
